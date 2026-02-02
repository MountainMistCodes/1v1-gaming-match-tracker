import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "@/components/navigation"
import { StatsCard } from "@/components/stats-card"
import { ActionCard } from "@/components/action-card"
import { PlayerCard } from "@/components/player-card"
import { ActivityFeed } from "@/components/activity-feed"
import { Award } from "lucide-react"
import Image from "next/image"
import type { Player, Match, Tournament, PlayerStats, Activity } from "@/lib/types"

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

const MIN_GAMES_FOR_RANKING = 10

function calculateNetWinRate(
  playerId: string,
  matches: any[],
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

  let score = winPercentage

  if (totalMatches < MIN_GAMES_FOR_RANKING) {
    const confidenceFactor = totalMatches / MIN_GAMES_FOR_RANKING
    score = 50 + (score - 50) * confidenceFactor
  }

  score += tournamentWins * 2

  return score
}

function calculatePlayerStats(
  players: Player[],
  matches: any[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  return players.map((player) => {
    const playerMatches = matches.filter((m) => m.player1_id === player.id || m.player2_id === player.id)
    const wins = matches.filter((m) => m.winner_id === player.id).length
    const losses = playerMatches.length - wins
    const tournamentWins = placements.filter((p) => p.player_id === player.id && p.placement === 1).length
    const tournamentParticipations = placements.filter((p) => p.player_id === player.id).length
    const netWinRate = calculateNetWinRate(player.id, matches, players)

    return {
      player,
      totalWins: wins,
      totalLosses: losses,
      totalMatches: playerMatches.length,
      winPercentage: playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0,
      netWinRate,
      tournamentWins,
      tournamentParticipations,
    }
  })
}

export default async function HomePage() {
  const { players, matches, tournaments, allMatches, placements, activities } = await getDashboardData()

  const playerStats = calculatePlayerStats(players, allMatches, placements)
  const topPlayers = [...playerStats]
    .map((stats) => ({ stats, rankingScore: calculateRankingScore(stats) }))
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, 3)
    .map((s) => s.stats)

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
