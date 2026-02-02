import { createClient } from "@/lib/supabase/server"
import { BottomNav, PageHeader } from "@/components/navigation"
import { PlayerCard } from "@/components/player-card"
import { Medal, Info } from "lucide-react"
import type { Player, PlayerStats } from "@/lib/types"

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

const MIN_GAMES_FOR_RANKING = 10 // Minimum games to be ranked fairly

function calculateNetWinRate(
  playerId: string,
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  players: Player[],
): number {
  const playerMatches = matches.filter((m) => m.player1_id === playerId || m.player2_id === playerId)
  
  if (playerMatches.length === 0) return 0

  // Calculate total wins for each player for strength ranking
  const playerWinsMap = new Map<string, number>()
  for (const player of players) {
    const wins = matches.filter((m) => m.winner_id === player.id).length
    playerWinsMap.set(player.id, wins)
  }

  const playerTotalWins = playerWinsMap.get(playerId) || 0
  
  let weightedScore = 0
  let totalWeight = 0

  // Calculate weighted net win rate based on opponent strength
  for (const match of playerMatches) {
    const isWinner = match.winner_id === playerId
    const opponentId = match.player1_id === playerId ? match.player2_id : match.player1_id
    const opponentWins = playerWinsMap.get(opponentId) || 0
    
    // Weight: opponent with more wins = stronger = higher weight
    const weight = 1 + (opponentWins / Math.max(playerTotalWins, 1)) * 0.5
    
    const score = isWinner ? weight : -weight
    weightedScore += score
    totalWeight += weight
  }

  return (weightedScore / totalWeight) * 100
}

function calculateRankingScore(stats: PlayerStats): number {
  const { totalMatches, winPercentage, tournamentWins } = stats

  // Base score from win percentage (0-100)
  let score = winPercentage

  // Apply confidence factor based on games played
  // Players with fewer games get their score reduced
  // This prevents someone with 1 win / 1 game (100%) from ranking above
  // someone with 80 wins / 100 games (80%)
  if (totalMatches < MIN_GAMES_FOR_RANKING) {
    // Gradually increase confidence as games approach minimum
    const confidenceFactor = totalMatches / MIN_GAMES_FOR_RANKING
    // Blend towards 50% (average) for low game counts
    score = 50 + (score - 50) * confidenceFactor
  }

  // Tournament bonus: each tournament win adds 2 points
  score += tournamentWins * 2

  return score
}

function calculateStats(
  players: Player[],
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  const statsWithScore = players
    .map((player) => {
      const playerMatches = matches.filter((m) => m.player1_id === player.id || m.player2_id === player.id)
      const wins = matches.filter((m) => m.winner_id === player.id).length
      const losses = playerMatches.length - wins
      const tournamentWins = placements.filter((p) => p.player_id === player.id && p.placement === 1).length
      const tournamentParticipations = placements.filter((p) => p.player_id === player.id).length
      const netWinRate = calculateNetWinRate(player.id, matches, players)

      const stats: PlayerStats = {
        player,
        totalWins: wins,
        totalLosses: losses,
        totalMatches: playerMatches.length,
        winPercentage: playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0,
        netWinRate,
        tournamentWins,
        tournamentParticipations,
      }

      return {
        stats,
        rankingScore: calculateRankingScore(stats),
      }
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)

  return statsWithScore.map((s) => s.stats)
}

export default async function LeaderboardPage() {
  const { players, matches, placements } = await getLeaderboardData()
  const rankings = calculateStats(players, matches, placements)

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="جدول امتیازات" subtitle="رتبه‌بندی کلی بازیکنان" />

      <div className="px-4 py-4">
        <div className="bg-card/50 border border-border rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            رتبه‌بندی بر اساس درصد برد، با در نظر گرفتن حداقل {MIN_GAMES_FOR_RANKING} بازی برای رتبه‌بندی عادلانه و امتیاز
            اضافی برای قهرمانی تورنمنت
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
