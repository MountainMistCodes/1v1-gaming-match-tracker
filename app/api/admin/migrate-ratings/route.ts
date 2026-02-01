import { createClient } from "@/lib/supabase/server"
import { initializeAllPlayerRatings, processMatchRating, processTournamentPlacementRating } from "@/lib/rating-calculator"

export const POST = async () => {
  try {
    const supabase = await createClient()

    // Step 1: Initialize all players with default ratings
    console.log("Initializing player ratings...")
    await initializeAllPlayerRatings(supabase)

    // Step 2: Process all historical matches in chronological order
    console.log("Processing historical matches...")
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .order("played_at", { ascending: true })

    if (matchesError) throw matchesError

    let matchCount = 0
    for (const match of matches || []) {
      await processMatchRating(supabase, match.id, match.winner_id, match.player1_id === match.winner_id ? match.player2_id : match.player1_id)
      matchCount++
    }

    console.log(`Processed ${matchCount} matches`)

    // Step 3: Process all tournament placements
    console.log("Processing tournament placements...")
    const { data: placements, error: placementsError } = await supabase
      .from("tournament_placements")
      .select("*")
      .in("placement", [1, 2, 3])
      .order("created_at", { ascending: true })

    if (placementsError) throw placementsError

    let placementCount = 0
    for (const placement of placements || []) {
      const result = await processTournamentPlacementRating(
        supabase,
        placement.player_id,
        placement.tournament_id,
        placement.placement,
      )
      if (result) placementCount++
    }

    console.log(`Processed ${placementCount} tournament placements`)

    // Step 4: Get updated rankings
    const { data: finalRankings, error: rankingsError } = await supabase
      .from("player_ratings")
      .select(
        `
        player_id,
        rating,
        rating_deviation,
        volatility,
        players(name)
      `,
      )
      .order("rating", { ascending: false })
      .limit(20)

    if (rankingsError) throw rankingsError

    return Response.json(
      {
        success: true,
        message: "Rating migration completed successfully",
        stats: {
          matchesProcessed: matchCount,
          placementsProcessed: placementCount,
          topPlayers: finalRankings,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Migration error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 },
    )
  }
}
