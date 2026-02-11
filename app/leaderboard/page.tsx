import { createClient } from "@/lib/supabase/server"
import { BottomNav, PageHeader } from "@/components/navigation"
import { PlayerCard } from "@/components/player-card"
import { Medal, Info } from "lucide-react"
import { MIN_GAMES_FOR_RANKING, rankPlayers } from "@/lib/ranking"
import type { Player } from "@/lib/types"

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

async function getLeaderboardData() {
  const supabase = await createClient()

  const [players, matches, placements] = await Promise.all([
    fetchAllRows(supabase, "players"),
    fetchAllRows(supabase, "matches"),
    fetchAllRows(supabase, "tournament_placements"),
  ])

  return {
    players: players as Player[],
    matches: matches,
    placements: placements,
  }
}

export default async function LeaderboardPage() {
  const { players, matches, placements } = await getLeaderboardData()
  const rankings = rankPlayers(players, matches, placements)

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="جدول امتیازات" subtitle="رتبه‌بندی کلی بازیکنان" />

      <div className="px-4 py-4">
        <div className="bg-card/50 border border-border rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            رتبه‌بندی بر اساس درصد برد تعدیل‌شده (با در نظر گرفتن حداقل {MIN_GAMES_FOR_RANKING} بازی)، قدرت حریفان و
            پاداش تورنمنت است؛ قهرمان ۵ برد معادل و نفر دوم ۲ برد معادل می‌گیرد.
          </p>
        </div>

        {rankings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>هنوز بازیکنی ثبت نشده</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((stats, index) => (
              <PlayerCard key={stats.player.id} stats={stats} rank={index + 1} showRank />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
