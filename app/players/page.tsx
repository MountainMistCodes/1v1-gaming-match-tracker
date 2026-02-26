"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { BottomNav, PageHeader } from "@/components/navigation"
import { PlayerCard } from "@/components/player-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, UserPlus, Loader2 } from "lucide-react"
import type { Player, PlayerStats } from "@/lib/types"
import { generateNewPlayerActivity } from "@/lib/activity-generator"
import { AvatarUpload } from "@/components/avatar-upload"
import { uploadImageToSupabase } from "@/lib/image-utils"
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows"
import { calculatePlayerStats, type RankingMatchRow, type RankingPlacementRow } from "@/lib/ranking"
import { revalidateLeaderboardCache } from "@/lib/revalidate-leaderboard"

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    const supabase = createClient()

    const [playersRes, matches, placements] = await Promise.all([
      supabase.from("players").select("id,name,avatar_url,created_at").order("name"),
      fetchAllRows<RankingMatchRow>((from, to) =>
        supabase.from("matches").select("player1_id,player2_id,winner_id").range(from, to),
      ),
      fetchAllRows<RankingPlacementRow>((from, to) =>
        supabase.from("tournament_placements").select("player_id,placement").range(from, to),
      ),
    ])

    const players = (playersRes.data || []) as Player[]
    const stats = calculatePlayerStats(players, matches, placements) as PlayerStats[]

    setPlayers(players)
    setPlayerStats(stats)
    setIsLoading(false)
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlayerName.trim()) return

    setIsAdding(true)
    const supabase = createClient()

    let avatarUrl: string | null = null
    if (newPlayerAvatar) {
      try {
        avatarUrl = await uploadImageToSupabase(newPlayerAvatar, "avatars")
      } catch (err) {
        console.error("Failed to upload avatar:", err)
      }
    }

    const { data: newPlayer, error } = await supabase
      .from("players")
      .insert({
        name: newPlayerName.trim(),
        avatar_url: avatarUrl,
      })
      .select()
      .single()

    if (!error && newPlayer) {
      await generateNewPlayerActivity(newPlayer as Player)
      await revalidateLeaderboardCache()

      setNewPlayerName("")
      setNewPlayerAvatar(null)
      setShowAddForm(false)
      await loadPlayers()
    }
    setIsAdding(false)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="بازیکنان" subtitle={`${players.length} بازیکن ثبت شده`} />

      <div className="px-4 py-4 space-y-4">
        {/* Add Player Section */}
        {showAddForm ? (
          <form onSubmit={addPlayer} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">افزودن بازیکن جدید</span>
            </div>

            <div className="mb-4">
              <AvatarUpload value={newPlayerAvatar} onChange={setNewPlayerAvatar} size="md" />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="نام بازیکن..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 bg-secondary border-0"
                autoFocus
              />
              <Button type="submit" disabled={isAdding || !newPlayerName.trim()}>
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن"}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => {
                setShowAddForm(false)
                setNewPlayerAvatar(null)
                setNewPlayerName("")
              }}
            >
              انصراف
            </Button>
          </form>
        ) : (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full h-14 rounded-2xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
          >
            <Plus className="h-5 w-5 ml-2" />
            افزودن بازیکن جدید
          </Button>
        )}

        {/* Players List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : playerStats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>هنوز بازیکنی ثبت نشده</p>
            <p className="text-sm">اولین بازیکن را اضافه کنید</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playerStats.map((stats) => (
              <PlayerCard key={stats.player.id} stats={stats} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
