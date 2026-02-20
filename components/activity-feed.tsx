"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ActivityCard } from "./activity-card"
import { NotificationToggle, showBrowserNotification, areNotificationsEnabled } from "./notification-toggle"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react"
import type { Activity } from "@/lib/types"
import { cn } from "@/lib/utils"

type FilterType = "all" | "matches" | "tournaments"

const STORAGE_KEY = "blacklist_last_seen_activity"

interface ActivityFeedProps {
  initialActivities?: Activity[]
  limit?: number
  showFilters?: boolean
  showNotificationToggle?: boolean
}

export function ActivityFeed({
  initialActivities = [],
  limit = 10,
  showFilters = true,
  showNotificationToggle = true,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [filter, setFilter] = useState<FilterType>("all")
  const [isLoading, setIsLoading] = useState(initialActivities.length === 0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastSeenId, setLastSeenId] = useState<string | null>(null)
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set())
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const loadActivities = useCallback(
    async (offset = 0) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (!error && data) {
        if (offset === 0) {
          setActivities(data as Activity[])
          if (data.length > 0 && !lastSeenId) {
            localStorage.setItem(STORAGE_KEY, data[0].id)
            setLastSeenId(data[0].id)
          }
        } else {
          setActivities((prev) => [...prev, ...(data as Activity[])])
        }
        setHasMore(data.length === limit)
      }

      setIsLoading(false)
      setIsLoadingMore(false)
    },
    [limit, lastSeenId],
  )

  // Always refresh on mount to avoid stale server-cached initial data.
  useEffect(() => {
    loadActivities()

    // Load last seen activity from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setLastSeenId(stored)
      }
    }
  }, [loadActivities])

  useEffect(() => {
    const supabase = createClient()
    let pollInterval: NodeJS.Timeout | null = null
    let lastActivityTime = activities[0]?.created_at || new Date().toISOString()

    // Try Realtime subscription
    const channel = supabase
      .channel(`activities-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
        },
        (payload) => {
          const newActivity = payload.new as Activity
          handleNewActivity(newActivity)
        },
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED")

        if (status === "SUBSCRIBED" && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }

        // If Realtime fails, use polling as fallback
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!pollInterval) {
            pollInterval = setInterval(async () => {
              const { data } = await supabase
                .from("activities")
                .select("*")
                .gt("created_at", lastActivityTime)
                .order("created_at", { ascending: false })

              if (data && data.length > 0) {
                data.reverse().forEach((activity) => {
                  handleNewActivity(activity as Activity)
                })
                lastActivityTime = data[0].created_at
              }
            }, 5000)
          }
        }
      })

    function handleNewActivity(newActivity: Activity) {
      setActivities((prev) => {
        if (prev.some((a) => a.id === newActivity.id)) {
          return prev
        }
        return [newActivity, ...prev]
      })

      setNewActivityIds((prev) => {
        const updated = new Set(prev)
        updated.add(newActivity.id)
        return updated
      })

      // Check and send notification
      if (areNotificationsEnabled()) {
        showBrowserNotification(newActivity.title, newActivity.description || "فعالیت جدید در بلک لیست", newActivity.id)
      }
    }

    return () => {
      supabase.removeChannel(channel)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [])

  function loadMore() {
    setIsLoadingMore(true)
    loadActivities(activities.length)
  }

  function markAllAsRead() {
    if (activities.length > 0) {
      localStorage.setItem(STORAGE_KEY, activities[0].id)
      setLastSeenId(activities[0].id)
      setNewActivityIds(new Set())
    }
  }

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true
    if (filter === "matches")
      return (
        activity.type === "match_result" || activity.type === "winning_streak" || activity.type === "rivalry_update"
      )
    if (filter === "tournaments") return activity.type === "tournament_complete"
    return true
  })

  // Group activities by time
  const groupedActivities = groupActivitiesByTime(filteredActivities)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {showFilters && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { key: "all", label: "همه" },
              { key: "matches", label: "مسابقات" },
              { key: "tournaments", label: "تورنمنت‌ها" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(key as FilterType)}
                className={cn(
                  "rounded-full text-xs whitespace-nowrap",
                  filter === key && "bg-primary text-primary-foreground",
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isRealtimeConnected ? "text-success" : "text-muted-foreground",
            )}
            title={isRealtimeConnected ? "متصل به سرور" : "حالت پولینگ"}
          >
            {isRealtimeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          </div>

          {newActivityIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              علامت‌گذاری همه
            </Button>
          )}

          {showNotificationToggle && <NotificationToggle />}
        </div>
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>هنوز فعالیتی ثبت نشده</p>
          <p className="text-sm">با ثبت مسابقه یا تورنمنت شروع کنید</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedActivities).map(([group, groupActivities]) => (
            <div key={group}>
              <p className="text-xs text-muted-foreground mb-2 font-medium">{group}</p>
              <div className="space-y-2">
                {groupActivities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} isNew={newActivityIds.has(activity.id)} />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="w-full bg-transparent">
              {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "بیشتر"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to group activities by time
function groupActivitiesByTime(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  activities.forEach((activity) => {
    const activityDate = new Date(activity.created_at)
    let group: string

    if (activityDate >= today) {
      group = "امروز"
    } else if (activityDate >= yesterday) {
      group = "دیروز"
    } else if (activityDate >= thisWeek) {
      group = "این هفته"
    } else {
      group = "قبل‌تر"
    }

    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(activity)
  })

  return groups
}
