import type { Player, PlayerStats } from "@/lib/types"

export const MIN_GAMES_FOR_RANKING = 10
const BASE_POINTS = 60
const RANK_PENALTY_MULTIPLIER = 0.8

interface PlayerRating {
  player: Player
  rating: number
  totalMatches: number
}

/**
 * Calculate match points based on opponent's rank
 * Winner gets positive points, loser gets negative points
 */
export function calculateMatchPoints(
  winnerRank: number,
  loserRank: number,
  totalPlayers: number,
): { winnerGains: number; loserLoses: number } {
  // Normalize ranks to 1-based system
  const rankDifference = Math.abs(winnerRank - loserRank)

  // If winner is higher ranked (lower number), they get fewer points
  if (winnerRank < loserRank) {
    // Higher ranked beating lower ranked (expected)
    const pointValue = Math.max(10, BASE_POINTS - rankDifference * RANK_PENALTY_MULTIPLIER)
    return {
      winnerGains: Math.round(pointValue),
      loserLoses: -Math.round(pointValue * 0.5), // Losing to higher rank is less penalizing
    }
  } else {
    // Lower ranked beating higher ranked (upset)
    const pointValue = Math.max(30, BASE_POINTS - rankDifference * RANK_PENALTY_MULTIPLIER)
    return {
      winnerGains: Math.round(pointValue), // Upset win gets more points
      loserLoses: -Math.round(pointValue * 1.5), // Losing to lower rank is very penalizing
    }
  }
}

/**
 * Calculate tournament placement bonus
 */
export function calculateTournamentBonus(placement: number): number {
  if (placement === 1) return 40
  if (placement === 2) return 20
  if (placement === 3) return 10
  return 0
}

/**
 * Get player's current rank position among all players by rating
 */
export function getPlayerRankPosition(
  playerId: string,
  allRatings: Map<string, number>,
): number {
  // Convert ratings to sorted array
  const sortedRatings = Array.from(allRatings.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  return sortedRatings.indexOf(playerId) + 1
}

/**
 * Calculate base win/loss points from match record
 */
function calculateMatchRecordPoints(
  player: Player,
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  allRatings: Map<string, number>,
): number {
  let points = 0
  const totalPlayers = allRatings.size

  for (const match of matches) {
    const isPlayer1 = match.player1_id === player.id
    const isPlayer2 = match.player2_id === player.id
    const isWinner = match.winner_id === player.id

    if (!isPlayer1 && !isPlayer2) continue

    // Get opponent
    const opponentId = isPlayer1 ? match.player2_id : match.player1_id

    // Get current ranks for this calculation
    const playerRank = getPlayerRankPosition(player.id, allRatings)
    const opponentRank = getPlayerRankPosition(opponentId, allRatings)

    const { winnerGains, loserLoses } = calculateMatchPoints(
      isWinner ? playerRank : opponentRank,
      isWinner ? opponentRank : playerRank,
      totalPlayers,
    )

    points += isWinner ? winnerGains : loserLoses
  }

  return points
}

/**
 * Calculate tournament bonus points
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
 * Apply confidence factor for players with fewer than MIN_GAMES_FOR_RANKING games
 */
export function applyConfidenceFactor(rating: number, totalMatches: number): number {
  if (totalMatches >= MIN_GAMES_FOR_RANKING) {
    return rating
  }

  const confidenceFactor = totalMatches / MIN_GAMES_FOR_RANKING
  // Blend toward 50 (neutral) for low game counts
  return 50 + (rating - 50) * confidenceFactor
}

/**
 * Calculate all player ratings
 * Returns ratings in order suitable for leaderboard display
 */
export function calculateAllPlayerRatings(
  players: Player[],
  matches: { player1_id: string; player2_id: string; winner_id: string }[],
  placements: { player_id: string; placement: number }[],
): PlayerStats[] {
  // First pass: calculate base ratings for all players
  const initialRatings = new Map<string, number>()

  for (const player of players) {
    const totalMatches = matches.filter(
      (m) => m.player1_id === player.id || m.player2_id === player.id,
    ).length
    initialRatings.set(player.id, 1000) // Start all at 1000 baseline
  }

  // Calculate iteratively to get accurate rank-based points
  let ratings = initialRatings
  let iterations = 3 // Usually converges in 2-3 iterations

  for (let i = 0; i < iterations; i++) {
    const newRatings = new Map<string, number>()

    for (const player of players) {
      const totalMatches = matches.filter(
        (m) => m.player1_id === player.id || m.player2_id === player.id,
      ).length

      // Calculate points from matches
      let matchPoints = 0
      for (const match of matches) {
        const isPlayer1 = match.player1_id === player.id
        const isPlayer2 = match.player2_id === player.id
        const isWinner = match.winner_id === player.id

        if (!isPlayer1 && !isPlayer2) continue

        const opponentId = isPlayer1 ? match.player2_id : match.player1_id
        const playerRating = ratings.get(player.id) || 1000
        const opponentRating = ratings.get(opponentId) || 1000

        // Simple point calculation based on ratings
        const ratingDiff = (playerRating - opponentRating) / 100 // Normalize to 0-10 scale
        const basePoints = 30 - Math.min(Math.max(ratingDiff, -10), 10)

        if (isWinner) {
          matchPoints += Math.max(10, basePoints)
        } else {
          matchPoints -= Math.max(5, basePoints)
        }
      }

      // Add tournament bonus
      const tournamentPoints = calculateTournamentPoints(player.id, placements)

      // Combine and apply confidence factor
      const baseRating = 1000 + matchPoints + tournamentPoints
      const finalRating = applyConfidenceFactor(baseRating, totalMatches)

      newRatings.set(player.id, finalRating)
    }

    ratings = newRatings
  }

  // Convert to PlayerStats format for display
  const playerStatsArray = players
    .map((player) => {
      const totalMatches = matches.filter(
        (m) => m.player1_id === player.id || m.player2_id === player.id,
      ).length
      const wins = matches.filter((m) => m.winner_id === player.id).length
      const losses = totalMatches - wins
      const tournamentWins = placements.filter(
        (p) => p.player_id === player.id && p.placement === 1,
      ).length
      const tournamentParticipations = placements.filter((p) => p.player_id === player.id).length

      const stats: PlayerStats = {
        player,
        totalWins: wins,
        totalLosses: losses,
        totalMatches,
        winPercentage: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        tournamentWins,
        tournamentParticipations,
        rating: ratings.get(player.id) || 1000,
      }

      return {
        stats,
        rating: ratings.get(player.id) || 1000,
      }
    })
    .filter(({ stats }) => stats.totalMatches >= MIN_GAMES_FOR_RANKING) // Filter out players below minimum
    .sort((a, b) => b.rating - a.rating) // Sort by rating descending
    .map(({ stats }) => stats)

  return playerStatsArray
}

// Backwards-compatible exports for legacy code
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
  // Legacy function - just returns a placeholder
  // New system calculates ratings differently
  return stats.totalWins + stats.tournamentWins * 10
}
