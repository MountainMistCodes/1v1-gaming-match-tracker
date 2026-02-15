import { createClient } from "@/lib/supabase/client"
import { rankPlayers } from "@/lib/ranking"
import type { Activity, ActivityType, ActivityColor, Player } from "@/lib/types"

interface CreateActivityParams {
  type: ActivityType
  title: string
  description?: string
  icon: string
  color: ActivityColor
  metadata?: Activity["metadata"]
  related_player_id?: string
  related_match_id?: string
  related_tournament_id?: string
}

type MatchRow = { player1_id: string; player2_id: string; winner_id: string }
type PlacementRow = { player_id: string; placement: number }

export interface RankingSnapshot {
  rankByPlayerId: Map<string, number>
  playersById: Map<string, Player>
}

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

function buildRankingSnapshot(players: Player[], matches: MatchRow[], placements: PlacementRow[]): RankingSnapshot {
  const rankings = rankPlayers(players, matches, placements)
  const rankByPlayerId = new Map<string, number>()
  const playersById = new Map<string, Player>()

  rankings.forEach((stats, index) => {
    rankByPlayerId.set(stats.player.id, index + 1)
    playersById.set(stats.player.id, stats.player)
  })

  return { rankByPlayerId, playersById }
}

export async function captureRankingSnapshot(): Promise<RankingSnapshot | null> {
  try {
    const supabase = createClient()
    const [players, matches, placements] = await Promise.all([
      fetchAllRows(supabase, "players"),
      fetchAllRows(supabase, "matches", "player1_id, player2_id, winner_id"),
      fetchAllRows(supabase, "tournament_placements", "player_id, placement"),
    ])

    return buildRankingSnapshot(players as Player[], matches as MatchRow[], placements as PlacementRow[])
  } catch (error) {
    console.error("Failed to capture ranking snapshot:", error)
    return null
  }
}

export async function createActivity(params: CreateActivityParams) {
  const supabase = createClient()

  const { error } = await supabase
    .from("activities")
    .insert({
      type: params.type,
      title: params.title,
      description: params.description || null,
      icon: params.icon,
      color: params.color,
      metadata: params.metadata || {},
      related_player_id: params.related_player_id || null,
      related_match_id: params.related_match_id || null,
      related_tournament_id: params.related_tournament_id || null,
    })
    .select()
    .single()

  // Notification is now triggered automatically via Supabase Realtime subscription in activity-feed.tsx
  return !error
}

// Generate match result activity
export async function generateMatchActivity(
  matchId: string,
  winner: Player,
  loser: Player,
  imageUrl?: string | null,
  note?: string | null,
  matchCount = 1,
) {
  await createActivity({
    type: "match_result",
    title: matchCount > 1 ? `${winner.name} ${matchCount} بار پیروز شد!` : `${winner.name} پیروز شد!`,
    description: `${winner.name} مقابل ${loser.name}`,
    icon: matchCount >= 5 ? "🔥" : "⚔️",
    color: matchCount >= 5 ? "orange" : "blue",
    metadata: {
      winner_id: winner.id,
      winner_name: winner.name,
      loser_id: loser.id,
      loser_name: loser.name,
      image_url: imageUrl || undefined,
      note: note || undefined,
      match_count: matchCount > 1 ? matchCount : undefined,
    },
    related_match_id: matchId,
    related_player_id: winner.id,
  })
}

// Generate tournament complete activity
export async function generateTournamentActivity(
  tournamentId: string,
  tournamentName: string,
  placements: { position: number; player: Player }[],
  imageUrl?: string | null,
) {
  const winner = placements.find((p) => p.position === 1)

  await createActivity({
    type: "tournament_complete",
    title: `${winner?.player.name || "بازیکن"} قهرمان ${tournamentName} شد!`,
    description: `تورنمنت با ${placements.length} شرکت‌کننده`,
    icon: "🏆",
    color: "gold",
    metadata: {
      tournament_name: tournamentName,
      placements: placements.map((p) => ({
        position: p.position,
        player_name: p.player.name,
      })),
      image_url: imageUrl || undefined, // Include image URL in metadata
    },
    related_tournament_id: tournamentId,
    related_player_id: winner?.player.id,
  })
}

// Generate winning streak activity
export async function generateStreakActivity(player: Player, streakCount: number) {
  if (streakCount < 3) return // Only notify for 3+ streak

  await createActivity({
    type: "winning_streak",
    title: `${player.name} در اوج است!`,
    description: `${streakCount} پیروزی متوالی`,
    icon: "🔥",
    color: "orange",
    metadata: {
      player_name: player.name,
      streak_count: streakCount,
    },
    related_player_id: player.id,
  })
}

// Generate rank change activity
export async function generateRankChangeActivity(
  player: Player,
  oldRank: number,
  newRank: number,
  passedPlayers: Player[] = [],
) {
  const movedUp = newRank < oldRank
  const passedPlayerNames = passedPlayers.map((p) => p.name).filter(Boolean)
  const topPassedNames = passedPlayerNames.slice(0, 2).join(" و ")
  const extraPassedCount = Math.max(0, passedPlayerNames.length - 2)

  const title =
    movedUp && passedPlayerNames.length > 0
      ? `${player.name} به رتبه ${newRank} صعود کرد و از ${topPassedNames}${extraPassedCount > 0 ? ` و ${extraPassedCount} نفر دیگر` : ""} عبور کرد!`
      : `${player.name} رتبه ${newRank} شد!`

  await createActivity({
    type: "rank_change",
    title,
    description: movedUp ? `صعود از رتبه ${oldRank}` : `نزول از رتبه ${oldRank}`,
    icon: movedUp ? "📈" : "📉",
    color: movedUp ? "green" : "red",
    metadata: {
      player_name: player.name,
      old_rank: oldRank,
      new_rank: newRank,
      passed_player_ids: passedPlayers.length > 0 ? passedPlayers.map((p) => p.id) : undefined,
      passed_player_names: passedPlayerNames.length > 0 ? passedPlayerNames : undefined,
    },
    related_player_id: player.id,
  })
}

export async function generateRankUpActivitiesFromSnapshot(previousSnapshot: RankingSnapshot | null) {
  if (!previousSnapshot) return

  const currentSnapshot = await captureRankingSnapshot()
  if (!currentSnapshot) return

  for (const [playerId, newRank] of currentSnapshot.rankByPlayerId.entries()) {
    const oldRank = previousSnapshot.rankByPlayerId.get(playerId)
    if (oldRank === undefined || newRank >= oldRank) {
      continue
    }

    const passedPlayers: Player[] = []

    for (const [otherPlayerId, otherOldRank] of previousSnapshot.rankByPlayerId.entries()) {
      if (otherPlayerId === playerId) continue

      const otherNewRank = currentSnapshot.rankByPlayerId.get(otherPlayerId)
      if (otherNewRank === undefined) continue

      const wasAheadBefore = otherOldRank < oldRank
      const isBehindNow = otherNewRank > newRank

      if (wasAheadBefore && isBehindNow) {
        const passedPlayer =
          currentSnapshot.playersById.get(otherPlayerId) || previousSnapshot.playersById.get(otherPlayerId)
        if (passedPlayer) {
          passedPlayers.push(passedPlayer)
        }
      }
    }

    if (passedPlayers.length === 0) {
      continue
    }

    const player = currentSnapshot.playersById.get(playerId) || previousSnapshot.playersById.get(playerId)
    if (!player) {
      continue
    }

    await generateRankChangeActivity(player, oldRank, newRank, passedPlayers)
  }
}

// Generate rivalry update activity
export async function generateRivalryActivity(
  player1: Player,
  player2: Player,
  player1Wins: number,
  player2Wins: number,
  totalMatches: number,
) {
  // Only generate for milestone matches (5, 10, 15, 20...)
  if (totalMatches < 5 || totalMatches % 5 !== 0) return

  const isTied = player1Wins === player2Wins

  await createActivity({
    type: "rivalry_update",
    title: isTied ? `رقابت نزدیک!` : `رقابت داغ بین ${player1.name} و ${player2.name}`,
    description: `نتیجه سری: ${player1Wins}-${player2Wins}`,
    icon: "⚡",
    color: "orange",
    metadata: {
      player1_id: player1.id,
      player1_name: player1.name,
      player2_id: player2.id,
      player2_name: player2.name,
      player1_wins: player1Wins,
      player2_wins: player2Wins,
    },
    related_player_id: player1.id,
  })
}

// Generate new player activity
export async function generateNewPlayerActivity(player: Player) {
  await createActivity({
    type: "new_player",
    title: `${player.name} به بازی پیوست!`,
    description: "چالشگر جدید وارد شد",
    icon: "🆕",
    color: "teal",
    metadata: {
      player_name: player.name,
    },
    related_player_id: player.id,
  })
}

// Generate milestone activity
export async function generateMilestoneActivity(milestoneType: "matches" | "tournaments" | "players", count: number) {
  const titles: Record<string, string> = {
    matches: `${count} مسابقه ثبت شد!`,
    tournaments: `${count} تورنمنت برگزار شد!`,
    players: `${count} بازیکن ثبت‌نام کردند!`,
  }

  await createActivity({
    type: "milestone",
    title: titles[milestoneType],
    description: "یک نقطه عطف جدید",
    icon: "🎉",
    color: "purple",
    metadata: {
      milestone_type: milestoneType,
      milestone_count: count,
    },
  })
}

// Helper to calculate and check for winning streaks
export async function checkAndGenerateStreakActivity(playerId: string) {
  const supabase = createClient()

  // Get player
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single()

  if (!player) return

  // Get recent matches for this player, ordered by date
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order("played_at", { ascending: false })
    .limit(20)

  if (!matches || matches.length === 0) return

  // Count consecutive wins
  let streak = 0
  for (const match of matches) {
    if (match.winner_id === playerId) {
      streak++
    } else {
      break
    }
  }

  // Generate activity for notable streaks (3, 5, 10, 15, 20)
  if ([3, 5, 10, 15, 20].includes(streak)) {
    await generateStreakActivity(player, streak)
  }
}

// Helper to check for rivalry milestones
export async function checkAndGenerateRivalryActivity(player1Id: string, player2Id: string) {
  const supabase = createClient()

  // Get both players
  const { data: players } = await supabase.from("players").select("*").in("id", [player1Id, player2Id])

  if (!players || players.length !== 2) return

  const player1 = players.find((p) => p.id === player1Id)!
  const player2 = players.find((p) => p.id === player2Id)!

  // Get all matches between these players
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .or(
      `and(player1_id.eq.${player1Id},player2_id.eq.${player2Id}),and(player1_id.eq.${player2Id},player2_id.eq.${player1Id})`,
    )

  if (!matches) return

  const totalMatches = matches.length
  const player1Wins = matches.filter((m) => m.winner_id === player1Id).length
  const player2Wins = matches.filter((m) => m.winner_id === player2Id).length

  // Check for rivalry milestone
  await generateRivalryActivity(player1, player2, player1Wins, player2Wins, totalMatches)
}

// Check and generate milestone activities
export async function checkAndGenerateMilestoneActivity() {
  const supabase = createClient()

  // Get counts
  const [matchesRes, tournamentsRes] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact" }),
    supabase.from("tournaments").select("id", { count: "exact" }),
  ])

  const matchCount = matchesRes.count || 0
  const tournamentCount = tournamentsRes.count || 0

  // Check for milestones (every 50 matches, every 10 tournaments)
  if (matchCount > 0 && matchCount % 50 === 0) {
    await generateMilestoneActivity("matches", matchCount)
  }

  if (tournamentCount > 0 && tournamentCount % 10 === 0) {
    await generateMilestoneActivity("tournaments", tournamentCount)
  }
}
