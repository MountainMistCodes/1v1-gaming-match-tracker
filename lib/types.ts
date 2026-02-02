export interface Player {
  id: string
  name: string
  avatar_url: string | null
  created_at: string
}

export interface Match {
  id: string
  player1_id: string
  player2_id: string
  winner_id: string
  notes: string | null
  played_at: string
  created_at: string
  player1?: Player
  player2?: Player
  winner?: Player
}

export interface Tournament {
  id: string
  name: string
  game_type: string | null
  tournament_date: string
  created_at: string
  placements?: TournamentPlacement[]
}

export interface TournamentPlacement {
  id: string
  tournament_id: string
  player_id: string
  placement: number
  created_at: string
  player?: Player
  tournament?: Tournament
}

export interface PlayerStats {
  player: Player
  totalWins: number
  totalLosses: number
  totalMatches: number
  winPercentage: number
  netWinRate: number
  tournamentWins: number
  tournamentParticipations: number
}

export interface HeadToHead {
  opponent: Player
  wins: number
  losses: number
  total: number
}

export type ActivityType =
  | "match_result"
  | "tournament_complete"
  | "rank_change"
  | "winning_streak"
  | "rivalry_update"
  | "new_player"
  | "milestone"

export type ActivityColor = "blue" | "gold" | "green" | "red" | "orange" | "teal" | "purple"

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string | null
  icon: string
  color: ActivityColor
  metadata: {
    winner_id?: string
    loser_id?: string
    winner_name?: string
    loser_name?: string
    streak_count?: number
    player1_id?: string
    player2_id?: string
    player1_name?: string
    player2_name?: string
    player1_wins?: number
    player2_wins?: number
    old_rank?: number
    new_rank?: number
    player_name?: string
    tournament_name?: string
    placements?: { position: number; player_name: string }[]
    milestone_count?: number
    milestone_type?: string
    image_url?: string
  }
  related_player_id: string | null
  related_match_id: string | null
  related_tournament_id: string | null
  created_at: string
}
