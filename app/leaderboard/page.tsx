import { createClient } from "@/lib/supabase/server"
import { BottomNav, PageHeader } from "@/components/navigation"
import { PlayerCard } from "@/components/player-card"
import { Medal, Info } from "lucide-react"
import type { Player, PlayerStats } from "@/lib/types"
import { calculateAllPlayerRatings } from "@/lib/fair-rating-calculator"

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

const MIN_GAMES_FOR_RANKING = 10

export default async function LeaderboardPage() {
  const { players, matches, placements } = await getLeaderboardData()
  console.log("[v0] Leaderboard - Data Summary:", {
    totalPlayers: players?.length,
    totalMatches: matches?.length,
    totalPlacements: placements?.length,
  })
  const rankings = calculateAllPlayerRatings(players, matches, placements)
  console.log("[v0] Leaderboard - Top 3 Rankings:", rankings.slice(0, 3).map((p) => ({ name: p.player.name, rating: p.rating })))

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="جدول امتیازات" subtitle="رتبه‌بندی کلی بازیکنان" />

      <div className="px-4 py-4">
        <div className="bg-card/50 border border-border rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              🏆 <strong>سیستم رتبه‌بندی منصفانه:</strong> امتیازات بر اساس قدرت حریف محاسبه می‌شود. برد بر حریف قوی‌تر = امتیاز بیش‌تر
            </p>
            <p>
              ⚔️ <strong>مسابقات ۱ در ۱:</strong> بازیکن را با نزدیک‌ترین رتبه‌بندی مقایسه کنید و بیش‌تر امتیاز بگیرید
            </p>
            <p>
              🥇 <strong>تورنمنت‌ها:</strong> رتبه‌بندی ۱ = +۴۰، رتبه‌بندی ۲ = +۲۰، رتبه‌بندی ۳ = +۱۰ امتیاز
            </p>
            <p>
              📊 <strong>حداقل بازی‌ها:</strong> فقط بازیکنانی که حداقل {MIN_GAMES_FOR_RANKING} بازی انجام داده‌اند در رتبه‌بندی نمایش داده می‌شوند
            </p>
          </div>
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
