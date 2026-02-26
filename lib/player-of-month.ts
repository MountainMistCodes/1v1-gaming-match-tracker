import type { Player } from "@/lib/types"

export type MonthlyMatchRow = {
  player1_id: string
  player2_id: string
  winner_id: string
  played_at: string
}

export type MonthlyPlacementRow = {
  player_id: string
  placement: number
  tournament_id: string
}

export type MonthlyTournamentRow = {
  id: string
  tournament_date: string
}

export type PlayerOfMonthResult = {
  player: Player
  totalWins: number
  totalMatches: number
  winPercentage: number
  tournamentWins: number
  monthlyScore: number
}

const TOURNAMENT_WIN_BONUS = 5

export function calculatePlayerOfMonth(
  players: Player[],
  matches: MonthlyMatchRow[],
  placements: MonthlyPlacementRow[],
  tournaments: MonthlyTournamentRow[],
): PlayerOfMonthResult | null {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const monthlyMatches = matches.filter((match) => {
    const playedAt = new Date(match.played_at)
    return playedAt >= monthStart && playedAt < nextMonthStart
  })

  const tournamentDateById = new Map(tournaments.map((tournament) => [tournament.id, tournament.tournament_date]))
  const monthlyTournamentWins = placements.filter((placement) => {
    if (placement.placement !== 1) {
      return false
    }

    const tournamentDate = tournamentDateById.get(placement.tournament_id)
    if (!tournamentDate) {
      return false
    }

    const tournamentPlayedAt = new Date(tournamentDate)
    return tournamentPlayedAt >= monthStart && tournamentPlayedAt < nextMonthStart
  })

  const winsByPlayer = new Map<string, number>()
  const matchesByPlayer = new Map<string, number>()
  const tournamentWinsByPlayer = new Map<string, number>()

  for (const match of monthlyMatches) {
    matchesByPlayer.set(match.player1_id, (matchesByPlayer.get(match.player1_id) ?? 0) + 1)
    matchesByPlayer.set(match.player2_id, (matchesByPlayer.get(match.player2_id) ?? 0) + 1)
    winsByPlayer.set(match.winner_id, (winsByPlayer.get(match.winner_id) ?? 0) + 1)
  }

  for (const placement of monthlyTournamentWins) {
    tournamentWinsByPlayer.set(placement.player_id, (tournamentWinsByPlayer.get(placement.player_id) ?? 0) + 1)
  }

  const candidates: PlayerOfMonthResult[] = []

  for (const player of players) {
    const totalWins = winsByPlayer.get(player.id) ?? 0
    const totalMatches = matchesByPlayer.get(player.id) ?? 0
    const tournamentWins = tournamentWinsByPlayer.get(player.id) ?? 0

    if (totalMatches === 0 && tournamentWins === 0) {
      continue
    }

    const winPercentage = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0
    const monthlyScore = totalWins + tournamentWins * TOURNAMENT_WIN_BONUS

    candidates.push({
      player,
      totalWins,
      totalMatches,
      winPercentage,
      tournamentWins,
      monthlyScore,
    })
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => {
    if (b.monthlyScore !== a.monthlyScore) return b.monthlyScore - a.monthlyScore
    if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage
    if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches
    return a.player.name.localeCompare(b.player.name, "fa")
  })

  return candidates[0]
}
