import type { Player, PlayerStats } from "@/lib/types"

export const MIN_GAMES_FOR_RANKING = 10

const SELF_WEIGHT = 0.7
const OPPONENT_WEIGHT = 0.3

const TOURNAMENT_FIRST_BONUS_WINS = 5
const TOURNAMENT_SECOND_BONUS_WINS = 2

type MatchRow = { player1_id: string; player2_id: string; winner_id: string }
type PlacementRow = { player_id: string; placement: number }

function smoothedWinPercentage(wins: number, games: number): number {
  const priorGames = MIN_GAMES_FOR_RANKING
  const priorWins = priorGames * 0.5
  const totalGames = games + priorGames
  if (totalGames <= 0) {
    return 50
  }

  return ((wins + priorWins) / totalGames) * 100
}

function calculateBonusWins(placements: PlacementRow[], playerId: string): number {
  return placements.reduce((total, placement) => {
    if (placement.player_id !== playerId) {
      return total
    }
    if (placement.placement === 1) {
      return total + TOURNAMENT_FIRST_BONUS_WINS
    }
    if (placement.placement === 2) {
      return total + TOURNAMENT_SECOND_BONUS_WINS
    }
    return total
  }, 0)
}

function opponentSmoothedWinPercentage(
  opponentId: string,
  excludedPlayerId: string,
  matches: MatchRow[],
): number {
  const opponentMatches = matches.filter(
    (m) =>
      (m.player1_id === opponentId || m.player2_id === opponentId) &&
      m.player1_id !== excludedPlayerId &&
      m.player2_id !== excludedPlayerId,
  )
  const opponentWins = opponentMatches.filter((m) => m.winner_id === opponentId).length
  return smoothedWinPercentage(opponentWins, opponentMatches.length)
}

function opponentStrengthPercentage(playerId: string, matches: MatchRow[]): number {
  const playerMatches = matches.filter((m) => m.player1_id === playerId || m.player2_id === playerId)
  if (playerMatches.length === 0) {
    return 50
  }

  const cachedOpponentStrength = new Map<string, number>()
  let total = 0

  for (const match of playerMatches) {
    const opponentId = match.player1_id === playerId ? match.player2_id : match.player1_id
    let opponentStrength = cachedOpponentStrength.get(opponentId)
    if (opponentStrength === undefined) {
      opponentStrength = opponentSmoothedWinPercentage(opponentId, playerId, matches)
      cachedOpponentStrength.set(opponentId, opponentStrength)
    }
    total += opponentStrength
  }

  return total / playerMatches.length
}

export function calculatePlayerStats(
  players: Player[],
  matches: MatchRow[],
  placements: PlacementRow[],
): PlayerStats[] {
  return players.map((player) => {
    const playerMatches = matches.filter((m) => m.player1_id === player.id || m.player2_id === player.id)
    const wins = matches.filter((m) => m.winner_id === player.id).length
    const losses = playerMatches.length - wins
    const tournamentWins = placements.filter((p) => p.player_id === player.id && p.placement === 1).length
    const tournamentParticipations = placements.filter((p) => p.player_id === player.id).length

    return {
      player,
      totalWins: wins,
      totalLosses: losses,
      totalMatches: playerMatches.length,
      winPercentage: playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0,
      tournamentWins,
      tournamentParticipations,
    }
  })
}

export function calculateRankingScore(
  stats: PlayerStats,
  matches: MatchRow[],
  placements: PlacementRow[],
): number {
  const bonusWins = calculateBonusWins(placements, stats.player.id)
  const effectiveWins = stats.totalWins + bonusWins
  const effectiveGames = stats.totalMatches + bonusWins

  const adjustedWinPercentage = smoothedWinPercentage(effectiveWins, effectiveGames)
  const opponentStrength = opponentStrengthPercentage(stats.player.id, matches)

  return adjustedWinPercentage * SELF_WEIGHT + opponentStrength * OPPONENT_WEIGHT
}

export function rankPlayers(players: Player[], matches: MatchRow[], placements: PlacementRow[]): PlayerStats[] {
  const statsWithScore = calculatePlayerStats(players, matches, placements)
    .map((stats) => ({ stats, rankingScore: calculateRankingScore(stats, matches, placements) }))
    .sort((a, b) => b.rankingScore - a.rankingScore)

  return statsWithScore.map((s) => s.stats)
}
