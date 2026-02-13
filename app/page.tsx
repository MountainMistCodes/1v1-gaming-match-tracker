import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "@/components/navigation"
import { StatsCard } from "@/components/stats-card"
import { ActionCard } from "@/components/action-card"
import { PlayerCard } from "@/components/player-card"
import { ActivityFeed } from "@/components/activity-feed"
import { Award } from "lucide-react"
import Image from "next/image"
import { rankPlayers } from "@/lib/ranking"
import type { Player, Match, Tournament, Activity } from "@/lib/types"

// Use stale-while-revalidate: cache for 5 minutes, revalidate in background
// This means: show cached data immediately, revalidate only after 5 minutes
// Real-time updates handled by ActivityFeed component with subscriptions
export const revalidate = 300 // 5 minutes - only regenerate after this time

async function fetchAllRows(supabase: any, table: string, selectQuery = "*") {
  const allData: any[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectQuery)
      .range(from, from + pageSize - 1)

    if (error || !data || data.length === 0) {
      hasMore = false
    } else {
      allData.push(...data)
      from += pageSize
      if (data.length < pageSize) {
        hasMore = false
      }
    }
  }

  return allData
}

async function getDashboardData() {
  const supabase = await createClient()

  // Get all players
  const { data: players } = await supabase.from("players").select("*").order("created_at", { ascending: false })

  // Get recent matches with player details (only last 5 for display)
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      player1:players!matches_player1_id_fkey(*),
      player2:players!matches_player2_id_fkey(*),
      winner:players!matches_winner_id_fkey(*)
    `,
    )
    .order("played_at", { ascending: false })
    .limit(5)

  // Get tournaments
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("tournament_date", { ascending: false })
    .limit(5)

  const allMatches = await fetchAllRows(supabase, "matches")

  const allPlacements = await fetchAllRows(supabase, "tournament_placements")

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  return {
    players: (players || []) as Player[],
    matches: (matches || []) as Match[],
    tournaments: (tournaments || []) as Tournament[],
    allMatches: allMatches,
    placements: allPlacements,
    activities: (activities || []) as Activity[],
  }
}

export const metadata = {
  title: "بلک لیست - صفحه‌ی اصلی",
  description: "ثبت نتایج مسابقات گیمینگ و رتبه‌بندی بازیکنان",
}

export default async function HomePage() {
  const { players, matches, tournaments, allMatches, placements, activities } = await getDashboardData()

  const rankings = rankPlayers(players, allMatches, placements)
  const topPlayers = rankings.slice(0, 3)

  const totalMatches = allMatches.length

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background px-4 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl overflow-hidden">
            <Image src="/logo.png" alt="بلک لیست" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">بلک لیست</h1>
            <p className="text-sm text-muted-foreground">ثبت نتایج مسابقات گیمینگ</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard title="بازیکنان" value={players.length} iconName="users" variant="primary" />
          <StatsCard title="مسابقات" value={totalMatches} iconName="swords" variant="accent" />
          <StatsCard title="تورنمنت‌ها" value={tournaments.length} iconName="trophy" variant="success" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">دسترسی سریع</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard
              href="/match"
              title="ثبت مسابقه"
              description="ثبت نتیجه جدید"
              iconName="swords"
              variant="primary"
            />
            <ActionCard
              href="/tournament"
              title="تورنمنت جدید"
              description="ثبت تورنمنت"
              iconName="trophy"
              variant="accent"
            />
            <ActionCard href="/players" title="بازیکنان" description="مدیریت بازیکنان" iconName="users" />
            <ActionCard href="/leaderboard" title="جدول امتیازات" description="رتبه‌بندی کلی" iconName="medal" />
          </div>
        </section>

        {/* Top Players */}
        {topPlayers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-foreground">برترین‌ها</h2>
            </div>
            <div className="space-y-2">
              {topPlayers.map((stats, index) => (
                <PlayerCard key={stats.player.id} stats={stats} rank={index + 1} showRank />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">اخبار و فعالیت‌ها</h2>
          <ActivityFeed initialActivities={activities} limit={10} showFilters showNotificationToggle />
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
