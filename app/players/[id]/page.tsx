import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import type { Player, Match, TournamentPlacement, HeadToHead } from "@/lib/types"
import { PlayerProfileClient } from "./client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPlayerData(playerId: string) {
  const supabase = await createClient()

  // Get player
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single()

  if (!player) return null

  // Get all matches for this player
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(*),
      player2:players!matches_player2_id_fkey(*),
      winner:players!matches_winner_id_fkey(*)
    `)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order("played_at", { ascending: false })

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
    matches: (matches || []) as Match[],
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
      const wins = vsMatches.filter((m) => m.winner_id === playerId).length
      headToHead.push({
        opponent,
        wins,
        losses: vsMatches.length - wins,
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
