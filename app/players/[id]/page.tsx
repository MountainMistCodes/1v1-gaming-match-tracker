import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import type { Player, Match, TournamentPlacement, HeadToHead } from "@/lib/types"
import { PlayerProfileClient } from "./client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchAllRows(
  supabase: any,
  table: string,
  selectQuery = "*",
  filter?: { column: string; op: string; value: string },
) {
  const allData: any[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(selectQuery)
      .range(from, from + pageSize - 1)

    if (filter) {
      query = query.or(filter.value)
    }

    const { data, error } = await query

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

async function getPlayerData(playerId: string) {
  const supabase = await createClient()

  // Get player
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single()

  if (!player) return null

  const matches = await fetchAllRows(
    supabase,
    "matches",
    `
    *,
    player1:players!matches_player1_id_fkey(*),
    player2:players!matches_player2_id_fkey(*),
    winner:players!matches_winner_id_fkey(*)
  `,
    { column: "player1_id", op: "eq", value: `player1_id.eq.${playerId},player2_id.eq.${playerId}` },
  )

  // Get tournament placements
  const { data: placements } = await supabase
    .from("tournament_placements")
    .select(`
      *,
      tournament:tournaments(*)
    `)
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })

  // Get all players for head-to-head
  const { data: allPlayers } = await supabase.from("players").select("*").neq("id", playerId)

  return {
    player: player as Player,
    matches: matches as Match[],
    placements: (placements || []) as TournamentPlacement[],
    allPlayers: (allPlayers || []) as Player[],
  }
}

function calculateHeadToHead(playerId: string, matches: Match[], allPlayers: Player[]): HeadToHead[] {
  const headToHead: HeadToHead[] = []

  allPlayers.forEach((opponent) => {
    const vsMatches = matches.filter(
      (m) =>
        (m.player1_id === playerId && m.player2_id === opponent.id) ||
        (m.player2_id === playerId && m.player1_id === opponent.id),
    )

    if (vsMatches.length > 0) {
      // Count wins where THIS player (playerId) won
      const wins = vsMatches.filter((m) => m.winner_id === playerId).length
      // Losses is simply total matches minus wins
      const losses = vsMatches.length - wins

      headToHead.push({
        opponent,
        wins,
        losses,
        total: vsMatches.length,
      })
    }
  })

  return headToHead.sort((a, b) => b.total - a.total)
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params
  const data = await getPlayerData(id)

  if (!data) {
    notFound()
  }

  const { player, matches, placements, allPlayers } = data

  // Calculate stats
  const totalWins = matches.filter((m) => m.winner_id === player.id).length
  const totalLosses = matches.length - totalWins
  const winPercentage = matches.length > 0 ? (totalWins / matches.length) * 100 : 0
  const tournamentWins = placements.filter((p) => p.placement === 1).length

  const headToHead = calculateHeadToHead(player.id, matches, allPlayers)

  return (
    <PlayerProfileClient
      player={player}
      matches={matches}
      placements={placements}
      headToHead={headToHead}
      totalWins={totalWins}
      totalLosses={totalLosses}
      winPercentage={winPercentage}
      tournamentWins={tournamentWins}
    />
  )
}
