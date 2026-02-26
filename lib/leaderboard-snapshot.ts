import { unstable_cache } from "next/cache"
import type { Player } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows"
import type { RankingMatchRow, RankingPlacementRow } from "@/lib/ranking"

export type LeaderboardMatchSnapshotRow = RankingMatchRow & {
  played_at: string
}

export type LeaderboardPlacementSnapshotRow = RankingPlacementRow & {
  tournament_id: string
}

export type LeaderboardTournamentSnapshotRow = {
  id: string
  tournament_date: string
}

export type LeaderboardSnapshot = {
  players: Player[]
  matches: LeaderboardMatchSnapshotRow[]
  placements: LeaderboardPlacementSnapshotRow[]
  tournaments: LeaderboardTournamentSnapshotRow[]
}

export const getLeaderboardSnapshot = unstable_cache(
  async (): Promise<LeaderboardSnapshot> => {
    const supabase = await createClient()

    const [players, matches, placements, tournaments] = await Promise.all([
      fetchAllRows<Player>((from, to) =>
        supabase
          .from("players")
          .select("id,name,avatar_url,created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      fetchAllRows<LeaderboardMatchSnapshotRow>((from, to) =>
        supabase.from("matches").select("player1_id,player2_id,winner_id,played_at").range(from, to),
      ),
      fetchAllRows<LeaderboardPlacementSnapshotRow>((from, to) =>
        supabase.from("tournament_placements").select("player_id,placement,tournament_id").range(from, to),
      ),
      fetchAllRows<LeaderboardTournamentSnapshotRow>((from, to) =>
        supabase.from("tournaments").select("id,tournament_date").range(from, to),
      ),
    ])

    return { players, matches, placements, tournaments }
  },
  ["leaderboard-snapshot-v1"],
  { revalidate: 60, tags: ["leaderboard"] },
)
