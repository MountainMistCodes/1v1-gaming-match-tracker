-- Create player_ratings table for Glicko-2 system
CREATE TABLE IF NOT EXISTS player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  rating FLOAT NOT NULL DEFAULT 1500,
  rating_deviation FLOAT NOT NULL DEFAULT 350,
  volatility FLOAT NOT NULL DEFAULT 0.06,
  last_rating_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tournament_rating FLOAT NOT NULL DEFAULT 1500,
  matches_played INTEGER DEFAULT 0,
  tournaments_participated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_player_ratings_player_id ON player_ratings(player_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_rating ON player_ratings(rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_ratings_updated ON player_ratings(updated_at DESC);

-- Create rating_history table to track rating changes over time
CREATE TABLE IF NOT EXISTS rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  rating_before FLOAT NOT NULL,
  rating_after FLOAT NOT NULL,
  rating_change FLOAT NOT NULL,
  rd_before FLOAT NOT NULL,
  rd_after FLOAT NOT NULL,
  volatility_before FLOAT NOT NULL,
  volatility_after FLOAT NOT NULL,
  opponent_id UUID REFERENCES players(id) ON DELETE SET NULL,
  result TEXT, -- 'win', 'loss', 'tournament_1st', 'tournament_2nd', 'tournament_3rd'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for rating_history
CREATE INDEX IF NOT EXISTS idx_rating_history_player ON rating_history(player_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_match ON rating_history(match_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_tournament ON rating_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_created ON rating_history(created_at DESC);

-- Enable RLS for new tables
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Public read access for player_ratings" ON player_ratings FOR SELECT USING (true);
CREATE POLICY "Public insert access for player_ratings" ON player_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for player_ratings" ON player_ratings FOR UPDATE USING (true);
CREATE POLICY "Public delete access for player_ratings" ON player_ratings FOR DELETE USING (true);

CREATE POLICY "Public read access for rating_history" ON rating_history FOR SELECT USING (true);
CREATE POLICY "Public insert access for rating_history" ON rating_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for rating_history" ON rating_history FOR UPDATE USING (true);
CREATE POLICY "Public delete access for rating_history" ON rating_history FOR DELETE USING (true);
