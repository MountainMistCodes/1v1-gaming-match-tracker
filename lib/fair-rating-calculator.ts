import type { Player, PlayerStats } from "@/lib/types"

export const MIN_GAMES_FOR_RANKING = 10
const BASE_POINTS = 60
const RANK_PENALTY_MULTIPLIER = 0.8

/**
 * Calculate match points based on opponent's rank
 * Winner gets positive points, loser gets negative points
 */
export function calculateMatchPoints(
  winnerRank: number,
  loserRank: number,
  totalPlayers: number,
): { winnerGains: number; loserLoses: number } {
  const rankDifference = Math.abs(winnerRank - loserRank)

  if (winnerRank < loserRank) {
    // Expected win
    const pointValue = Math.max(
      10,
      BASE_POINTS - rankDifference * RANK_PENALTY_MULTIPLIER,
    )
    return {
      winnerGains: Math.round(pointValue),
      loserLoses: -Math.round(pointValue * 0.5),
    }
  } else {
    // Upset win
    const pointValue = Math.max(
      30,
      BASE_POINTS - rankDifference * RANK_PENALTY_MULTIPLIER,
    )
    return {
      winnerGains: Math.round(pointValue),
      loserLoses: -Math.round(pointValue * 1.5),
    }
  }
}

/**
 * Tournament placement bonus
 */
export function calculateTournamentBonus(placement: number): number {
  if (placement === 1) return 40
  if (placement === 2) return 20
  if (placement === 3) return 10
  return 0
}

/**
 * Build a stable rank map for the current iteration
 */
function getRankMap(ratings: Map<string, number>): Map<string, number> {
  const sorted = Array.from(ratings.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  const rankMap = new Map<string, number>()
  sorted.forEach((id, index) => {
    rankMap.set(id, index + 1)
  })

  return rankMap
}

/**
 * Tournament bonus aggregation
 */
function calculateTournamentPoints(
  playerId: string,
  placements: { player_id: string; placement: number }[],
): number {
  return placements
    .filter((p) => p.player_id === playerId)
    .reduce((sum, p) => sum + calculateTournamentBonus(p.placement), 0)
}

/**
 * Calculate all player ratings
 */
function logDebugInfo(playerStatsArray: PlayerStats[]): void {
  if (typeof window !== "undefined") {
    console.log("[v0 Rating Debug]", {
      totalPlayers: playerStatsArray.length,
      topPlayer: playerStatsArray[0]
        ? {
            name: playerStatsArray[0].player.name,
            rating: playerStatsArray[0].rating.toFixed(2),
            wins: playerStatsArray[0].totalWins,
            matches: playerStatsArray[0].totalMatches,
          }
        : null,
    })
  }
}

export function calculateAllPlayerRatings(
  players: Player[],
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  // Initialize ratings
  let ratings = new Map<string, number>()
  for (const player of players) {
    ratings.set(player.id, 1000)
  }

  const iterations = 3

  for (let i = 0; i < iterations; i++) {
    const rankMap = getRankMap(ratings)
    const newRatings = new Map(ratings)

    for (const player of players) {
      const totalMatches = matches.filter(
        (m) => m.player1_id === player.id || m.player2_id === player.id,
      ).length

      let matchPoints = 0

      for (const match of matches) {
        const isPlayer1 = match.player1_id === player.id
        const isPlayer2 = match.player2_id === player.id
        if (!isPlayer1 && !isPlayer2) continue

        const opponentId = isPlayer1
          ? match.player2_id
          : match.player1_id

        const isWinner = match.winner_id === player.id

        const playerRank = rankMap.get(player.id)!
        const opponentRank = rankMap.get(opponentId)!

        const { winnerGains, loserLoses } = calculateMatchPoints(
          isWinner ? playerRank : opponentRank,
          isWinner ? opponentRank : playerRank,
          rankMap.size,
        )

        matchPoints += isWinner ? winnerGains : loserLoses
      }

      const tournamentPoints = calculateTournamentPoints(
        player.id,
        placements,
      )

      // Confidence factor limits impact for low-game players
      const confidence = Math.min(
        1,
        totalMatches / MIN_GAMES_FOR_RANKING,
      )

      const delta = (matchPoints + tournamentPoints) * confidence

      const currentRating = ratings.get(player.id) || 1000
      newRatings.set(player.id, currentRating + delta)
    }

    ratings = newRatings
  }

  // Build PlayerStats for leaderboard
  const playerStatsArray = players
    .map((player) => {
      const totalMatches = matches.filter(
        (m) => m.player1_id === player.id || m.player2_id === player.id,
      ).length

      const wins = matches.filter(
        (m) => m.winner_id === player.id,
      ).length

      const losses = totalMatches - wins

      const tournamentWins = placements.filter(
        (p) => p.player_id === player.id && p.placement === 1,
      ).length

      const tournamentParticipations = placements.filter(
        (p) => p.player_id === player.id,
      ).length

      const rating = ratings.get(player.id) || 1000

      return {
        player,
        totalWins: wins,
        totalLosses: losses,
        totalMatches,
        winPercentage:
          totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        tournamentWins,
        tournamentParticipations,
        rating,
      } satisfies PlayerStats
    })
    .filter(
      (stats) => stats.totalMatches >= MIN_GAMES_FOR_RANKING,
    )
    .sort((a, b) => b.rating - a.rating)

  logDebugInfo(playerStatsArray)
  return playerStatsArray
}

/**
 * Backwards-compatible exports
 */
export function calculateStats(
  players: Player[],
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  return calculateAllPlayerRatings(players, matches, placements)
}

export function calculatePlayerStats(
  players: Player[],
  matches: any[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  return calculateAllPlayerRatings(players, matches, placements)
}

export function calculateRankingScore(stats: PlayerStats): number {
  // Legacy placeholder
  return stats.totalWins + stats.tournamentWins * 10
}
