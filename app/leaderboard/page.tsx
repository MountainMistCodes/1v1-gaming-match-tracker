import { createClient } from "@/lib/supabase/server"
import { BottomNav, PageHeader } from "@/components/navigation"
import { Medal, Info } from "lucide-react"
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

  const [players, ratings] = await Promise.all([
    fetchAllRows(supabase, "players"),
    fetchAllRows(supabase, "player_ratings", "player_id, rating, rating_deviation, volatility"),
  ])

  return {
    players: players as Player[],
    ratings: ratings,
  }
}

function sortPlayersByRating(
  players: Player[],
  ratings: { player_id: string; rating: number; rating_deviation: number; volatility: number }[],
): (Player & { rating: number; rd: number; volatility: number })[] {
  const ratingMap = new Map(ratings.map((r) => [r.player_id, r]))

  return players
    .map((player) => {
      const playerRating = ratingMap.get(player.id) || { rating: 1500, rating_deviation: 350, volatility: 0.06 }
      return {
        ...player,
        rating: playerRating.rating,
        rd: playerRating.rating_deviation,
        volatility: playerRating.volatility,
      }
    })
    .sort((a, b) => b.rating - a.rating)
}

export default async function LeaderboardPage() {
  const { players, ratings } = await getLeaderboardData()
  const sortedPlayers = sortPlayersByRating(players, ratings)

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="جدول امتیازات" subtitle="رتبه‌بندی Glicko-2" />

      <div className="px-4 py-4">
        <div className="bg-card/50 border border-border rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            رتبه‌بندی بر اساس سیستم Glicko-2، با در نظر گرفتن قدرت حریف، فعالیت و عملکرد تورنمنت
          </p>
        </div>

        {sortedPlayers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>هنوز بازیکنی ثبت نشده</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                <span className="font-bold text-muted-foreground min-w-8 text-center">{index + 1}</span>
                <span className="flex-1 font-medium">{player.name}</span>
                <span className="font-semibold text-primary">{player.rating.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
