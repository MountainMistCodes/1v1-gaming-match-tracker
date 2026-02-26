import { notFound } from "next/navigation"
import { PlayerProfileClient } from "./client"
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows"
import { createClient } from "@/lib/supabase/server"
import type { HeadToHead, Match, Player, TournamentPlacement } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPlayerData(playerId: string) {
  const supabase = await createClient()

  const { data: player } = await supabase.from("players").select("id,name,avatar_url,created_at").eq("id", playerId).single()
  if (!player) {
    return null
  }

  const [matches, placementsRes, allPlayersRes] = await Promise.all([
    fetchAllRows<any>((from, to) =>
      supabase
        .from("matches")
        .select(
          `
          id,player1_id,player2_id,winner_id,notes,played_at,created_at,
          player1:players!matches_player1_id_fkey(id,name,avatar_url,created_at),
          player2:players!matches_player2_id_fkey(id,name,avatar_url,created_at),
          winner:players!matches_winner_id_fkey(id,name,avatar_url,created_at)
        `,
        )
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order("played_at", { ascending: false })
        .range(from, to),
    ),
    supabase
      .from("tournament_placements")
      .select(
        `
        id,tournament_id,player_id,placement,created_at,
        tournament:tournaments(id,name,game_type,tournament_date,created_at)
      `,
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false }),
    supabase.from("players").select("id,name,avatar_url,created_at").neq("id", playerId),
  ])

  return {
    player: player as Player,
    matches: matches as Match[],
    placements: (placementsRes.data || []) as unknown as TournamentPlacement[],
    allPlayers: (allPlayersRes.data || []) as Player[],
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
