/**
 * Rating Calculator - Handles match and tournament rating updates
 * Integrates Glicko-2 engine with tournament placement system
 */

import { createClient } from "@/lib/supabase/server"
import {
  updateRating,
  getDefaultRating,
  calculateRatingChange,
  type PlayerRating,
  type MatchResult,
} from "@/lib/glicko2-engine"

export interface RatingUpdateResult {
  playerId: string
  ratingBefore: number
  ratingAfter: number
  ratingChange: number
  rdBefore: number
  rdAfter: number
  volatilityBefore: number
  volatilityAfter: number
}

/**
 * Get or initialize player rating
 */
export const getPlayerRating = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
): Promise<PlayerRating> => {
  const { data } = await supabase
    .from("player_ratings")
    .select("rating, rating_deviation, volatility")
    .eq("player_id", playerId)
    .single()

  if (data) {
    return {
      rating: data.rating,
      rd: data.rating_deviation,
      volatility: data.volatility,
    }
  }

  return getDefaultRating()
}

/**
 * Save updated player rating
 */
export const savePlayerRating = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  oldRating: PlayerRating,
  newRating: PlayerRating,
  matchId?: string,
  tournamentId?: string,
  opponentId?: string,
  result?: string,
): Promise<void> => {
  // Upsert player rating
  await supabase.from("player_ratings").upsert(
    {
      player_id: playerId,
      rating: newRating.rating,
      rating_deviation: newRating.rd,
      volatility: newRating.volatility,
      last_rating_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" },
  )

  // Record rating history
  await supabase.from("rating_history").insert({
    player_id: playerId,
    match_id: matchId || null,
    tournament_id: tournamentId || null,
    rating_before: oldRating.rating,
    rating_after: newRating.rating,
    rating_change: newRating.rating - oldRating.rating,
    rd_before: oldRating.rd,
    rd_after: newRating.rd,
    volatility_before: oldRating.volatility,
    volatility_after: newRating.volatility,
    opponent_id: opponentId || null,
    result: result || null,
  })
}

/**
 * Process 1v1 match result
 */
export const processMatchRating = async (
  supabase: ReturnType<typeof createClient>,
  matchId: string,
  winnerId: string,
  loserId: string,
): Promise<{ winner: RatingUpdateResult; loser: RatingUpdateResult }> => {
  const winnerRatingBefore = await getPlayerRating(supabase, winnerId)
  const loserRatingBefore = await getPlayerRating(supabase, loserId)

  // Update winner (result = 1 for win)
  const winnerRatingAfter = updateRating(winnerRatingBefore, [
    {
      playerRating: winnerRatingBefore,
      opponentRating: loserRatingBefore.rating,
      opponentRD: loserRatingBefore.rd,
      result: 1,
    },
  ])

  // Update loser (result = 0 for loss)
  const loserRatingAfter = updateRating(loserRatingBefore, [
    {
      playerRating: loserRatingBefore,
      opponentRating: winnerRatingBefore.rating,
      opponentRD: winnerRatingBefore.rd,
      result: 0,
    },
  ])

  // Save both ratings
  await savePlayerRating(
    supabase,
    winnerId,
    winnerRatingBefore,
    winnerRatingAfter,
    matchId,
    undefined,
    loserId,
    "win",
  )

  await savePlayerRating(
    supabase,
    loserId,
    loserRatingBefore,
    loserRatingAfter,
    matchId,
    undefined,
    winnerId,
    "loss",
  )

  return {
    winner: {
      playerId: winnerId,
      ratingBefore: winnerRatingBefore.rating,
      ratingAfter: winnerRatingAfter.rating,
      ratingChange: winnerRatingAfter.rating - winnerRatingBefore.rating,
      rdBefore: winnerRatingBefore.rd,
      rdAfter: winnerRatingAfter.rd,
      volatilityBefore: winnerRatingBefore.volatility,
      volatilityAfter: winnerRatingAfter.volatility,
    },
    loser: {
      playerId: loserId,
      ratingBefore: loserRatingBefore.rating,
      ratingAfter: loserRatingAfter.rating,
      ratingChange: loserRatingAfter.rating - loserRatingBefore.rating,
      rdBefore: loserRatingBefore.rd,
      rdAfter: loserRatingAfter.rd,
      volatilityBefore: loserRatingBefore.volatility,
      volatilityAfter: loserRatingAfter.volatility,
    },
  }
}

/**
 * Calculate average rating of tournament field
 */
export const calculateAverageFieldRating = async (
  supabase: ReturnType<typeof createClient>,
  tournamentId: string,
): Promise<number> => {
  const { data: placements } = await supabase
    .from("tournament_placements")
    .select("player_id")
    .eq("tournament_id", tournamentId)

  if (!placements || placements.length === 0) return 1500

  let totalRating = 0
  for (const placement of placements) {
    const playerRating = await getPlayerRating(supabase, placement.player_id)
    totalRating += playerRating.rating
  }

  return totalRating / placements.length
}

/**
 * Process tournament placement for rating update
 * Virtual match method: Tournament placement → virtual match result
 */
export const processTournamentPlacementRating = async (
  supabase: ReturnType<typeof createClient>,
  playerId: string,
  tournamentId: string,
  placement: number,
): Promise<RatingUpdateResult | null> => {
  // Only score top 3 placements
  if (placement > 3) return null

  const playerRatingBefore = await getPlayerRating(supabase, playerId)
  const avgFieldRating = await calculateAverageFieldRating(supabase, tournamentId)

  // Map placement to virtual match result
  let virtualOpponentRating: number
  let result: number

  switch (placement) {
    case 1:
      // 1st place: Win against strong opponent (field average + 150)
      virtualOpponentRating = avgFieldRating + 150
      result = 1
      break
    case 2:
      // 2nd place: Win against slightly above-average opponent (+50 points guaranteed)
      virtualOpponentRating = avgFieldRating + 50
      result = 1
      break
    case 3:
      // 3rd place: Win against average opponent (small positive gain)
      virtualOpponentRating = avgFieldRating
      result = 1
      break
    default:
      return null
  }

  const playerRatingAfter = updateRating(playerRatingBefore, [
    {
      playerRating: playerRatingBefore,
      opponentRating: virtualOpponentRating,
      opponentRD: 30, // Assume low deviation for field average
      result,
    },
  ])

  // Save rating
  const resultText = placement === 1 ? "tournament_1st" : placement === 2 ? "tournament_2nd" : "tournament_3rd"

  await savePlayerRating(
    supabase,
    playerId,
    playerRatingBefore,
    playerRatingAfter,
    undefined,
    tournamentId,
    undefined,
    resultText,
  )

  return {
    playerId,
    ratingBefore: playerRatingBefore.rating,
    ratingAfter: playerRatingAfter.rating,
    ratingChange: playerRatingAfter.rating - playerRatingBefore.rating,
    rdBefore: playerRatingBefore.rd,
    rdAfter: playerRatingAfter.rd,
    volatilityBefore: playerRatingBefore.volatility,
    volatilityAfter: playerRatingAfter.volatility,
  }
}

/**
 * Initialize all players with default ratings
 */
export const initializeAllPlayerRatings = async (
  supabase: ReturnType<typeof createClient>,
): Promise<void> => {
  const { data: players } = await supabase.from("players").select("id")

  if (!players) return

  const defaultRating = getDefaultRating()
  const ratingInserts = players.map((player) => ({
    player_id: player.id,
    rating: defaultRating.rating,
    rating_deviation: defaultRating.rd,
    volatility: defaultRating.volatility,
  }))

  // Upsert to avoid duplicates
  for (const ratingData of ratingInserts) {
    await supabase.from("player_ratings").upsert(ratingData, { onConflict: "player_id" })
  }
}
