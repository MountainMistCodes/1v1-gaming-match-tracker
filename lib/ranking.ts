import type { Player, PlayerStats } from "@/lib/types"

export const MIN_GAMES_FOR_RANKING = 10

const SELF_WEIGHT = 0.7
const OPPONENT_WEIGHT = 0.3

const TOURNAMENT_FIRST_BONUS_WINS = 5
const TOURNAMENT_SECOND_BONUS_WINS = 2

export type RankingMatchRow = { player1_id: string; player2_id: string; winner_id: string }
export type RankingPlacementRow = { player_id: string; placement: number }

type PlayerAggregates = {
  totalMatchesByPlayer: Map<string, number>
  totalWinsByPlayer: Map<string, number>
  opponentMatchCountsByPlayer: Map<string, Map<string, number>>
  directedWinsByPlayer: Map<string, Map<string, number>>
  tournamentWinsByPlayer: Map<string, number>
  tournamentParticipationsByPlayer: Map<string, number>
  bonusWinsByPlayer: Map<string, number>
}

function incrementMap(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function incrementNestedMap(map: Map<string, Map<string, number>>, outerKey: string, innerKey: string, amount = 1) {
  let nested = map.get(outerKey)
  if (!nested) {
    nested = new Map<string, number>()
    map.set(outerKey, nested)
  }
  nested.set(innerKey, (nested.get(innerKey) ?? 0) + amount)
}

function getNestedCount(map: Map<string, Map<string, number>>, outerKey: string, innerKey: string): number {
  return map.get(outerKey)?.get(innerKey) ?? 0
}

function smoothedWinPercentage(wins: number, games: number): number {
  const priorGames = MIN_GAMES_FOR_RANKING
  const priorWins = priorGames * 0.5
  const totalGames = games + priorGames
  if (totalGames <= 0) {
    return 50
  }

  return ((wins + priorWins) / totalGames) * 100
}

function buildAggregates(matches: RankingMatchRow[], placements: RankingPlacementRow[]): PlayerAggregates {
  const totalMatchesByPlayer = new Map<string, number>()
  const totalWinsByPlayer = new Map<string, number>()
  const opponentMatchCountsByPlayer = new Map<string, Map<string, number>>()
  const directedWinsByPlayer = new Map<string, Map<string, number>>()
  const tournamentWinsByPlayer = new Map<string, number>()
  const tournamentParticipationsByPlayer = new Map<string, number>()
  const bonusWinsByPlayer = new Map<string, number>()

  for (const match of matches) {
    const playerA = match.player1_id
    const playerB = match.player2_id

    incrementMap(totalMatchesByPlayer, playerA)
    incrementMap(totalMatchesByPlayer, playerB)

    incrementNestedMap(opponentMatchCountsByPlayer, playerA, playerB)
    incrementNestedMap(opponentMatchCountsByPlayer, playerB, playerA)

    incrementMap(totalWinsByPlayer, match.winner_id)

    const loserId = match.winner_id === playerA ? playerB : playerA
    incrementNestedMap(directedWinsByPlayer, match.winner_id, loserId)
  }

  for (const placement of placements) {
    const playerId = placement.player_id
    incrementMap(tournamentParticipationsByPlayer, playerId)

    if (placement.placement === 1) {
      incrementMap(tournamentWinsByPlayer, playerId)
      incrementMap(bonusWinsByPlayer, playerId, TOURNAMENT_FIRST_BONUS_WINS)
    } else if (placement.placement === 2) {
      incrementMap(bonusWinsByPlayer, playerId, TOURNAMENT_SECOND_BONUS_WINS)
    }
  }

  return {
    totalMatchesByPlayer,
    totalWinsByPlayer,
    opponentMatchCountsByPlayer,
    directedWinsByPlayer,
    tournamentWinsByPlayer,
    tournamentParticipationsByPlayer,
    bonusWinsByPlayer,
  }
}

function opponentSmoothedWinPercentage(
  opponentId: string,
  excludedPlayerId: string,
  aggregates: PlayerAggregates,
): number {
  const opponentMatches = aggregates.totalMatchesByPlayer.get(opponentId) ?? 0
  const matchesAgainstExcluded = getNestedCount(aggregates.opponentMatchCountsByPlayer, opponentId, excludedPlayerId)
  const gamesExcludingPlayer = opponentMatches - matchesAgainstExcluded

  const opponentWins = aggregates.totalWinsByPlayer.get(opponentId) ?? 0
  const opponentWinsAgainstExcluded = getNestedCount(aggregates.directedWinsByPlayer, opponentId, excludedPlayerId)
  const winsExcludingPlayer = opponentWins - opponentWinsAgainstExcluded

  return smoothedWinPercentage(winsExcludingPlayer, gamesExcludingPlayer)
}

function opponentStrengthPercentage(playerId: string, aggregates: PlayerAggregates): number {
  const totalMatches = aggregates.totalMatchesByPlayer.get(playerId) ?? 0
  if (totalMatches === 0) {
    return 50
  }

  const opponents = aggregates.opponentMatchCountsByPlayer.get(playerId)
  if (!opponents || opponents.size === 0) {
    return 50
  }

  let weightedOpponentStrength = 0

  for (const [opponentId, encounterCount] of opponents.entries()) {
    const opponentStrength = opponentSmoothedWinPercentage(opponentId, playerId, aggregates)
    weightedOpponentStrength += opponentStrength * encounterCount
  }

  return weightedOpponentStrength / totalMatches
}

export function calculatePlayerStats(
  players: Player[],
  matches: RankingMatchRow[],
  placements: RankingPlacementRow[],
): PlayerStats[] {
  const aggregates = buildAggregates(matches, placements)
  return calculatePlayerStatsFromAggregates(players, aggregates)
}

function calculatePlayerStatsFromAggregates(players: Player[], aggregates: PlayerAggregates): PlayerStats[] {

  return players.map((player) => {
    const totalMatches = aggregates.totalMatchesByPlayer.get(player.id) ?? 0
    const totalWins = aggregates.totalWinsByPlayer.get(player.id) ?? 0
    const totalLosses = totalMatches - totalWins
    const tournamentWins = aggregates.tournamentWinsByPlayer.get(player.id) ?? 0
    const tournamentParticipations = aggregates.tournamentParticipationsByPlayer.get(player.id) ?? 0

    return {
      player,
      totalWins,
      totalLosses,
      totalMatches,
      winPercentage: totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0,
      tournamentWins,
      tournamentParticipations,
    }
  })
}

function calculateRankingScoreFromAggregates(stats: PlayerStats, aggregates: PlayerAggregates): number {
  const bonusWins = aggregates.bonusWinsByPlayer.get(stats.player.id) ?? 0
  const effectiveWins = stats.totalWins + bonusWins
  const effectiveGames = stats.totalMatches + bonusWins

  const adjustedWinPercentage = smoothedWinPercentage(effectiveWins, effectiveGames)
  const opponentStrength = opponentStrengthPercentage(stats.player.id, aggregates)

  return adjustedWinPercentage * SELF_WEIGHT + opponentStrength * OPPONENT_WEIGHT
}

export function calculateRankingScore(
  stats: PlayerStats,
  matches: RankingMatchRow[],
  placements: RankingPlacementRow[],
): number {
  const aggregates = buildAggregates(matches, placements)
  return calculateRankingScoreFromAggregates(stats, aggregates)
}

export function rankPlayers(
  players: Player[],
  matches: RankingMatchRow[],
  placements: RankingPlacementRow[],
): PlayerStats[] {
  const aggregates = buildAggregates(matches, placements)
  const playerStats = calculatePlayerStatsFromAggregates(players, aggregates)

  const statsWithScore = playerStats
    .map((stats) => ({ stats, rankingScore: calculateRankingScoreFromAggregates(stats, aggregates) }))
    .sort((a, b) => b.rankingScore - a.rankingScore)

  return statsWithScore.map((s) => ({ ...s.stats, rankingScore: s.rankingScore }))
}
