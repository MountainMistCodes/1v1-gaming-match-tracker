-- Rollback script for Glicko-2 rating system
-- This script removes all tables and policies created by scripts/008_create_player_ratings.sql

-- Drop RLS policies
DROP POLICY IF EXISTS "Public read access for player_ratings" ON player_ratings;
DROP POLICY IF EXISTS "Public insert access for player_ratings" ON player_ratings;
DROP POLICY IF EXISTS "Public update access for player_ratings" ON player_ratings;
DROP POLICY IF EXISTS "Public delete access for player_ratings" ON player_ratings;

DROP POLICY IF EXISTS "Public read access for rating_history" ON rating_history;
DROP POLICY IF EXISTS "Public insert access for rating_history" ON rating_history;
DROP POLICY IF EXISTS "Public update access for rating_history" ON rating_history;
DROP POLICY IF EXISTS "Public delete access for rating_history" ON rating_history;

-- Disable RLS on tables
ALTER TABLE IF EXISTS player_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rating_history DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_rating_history_created;
DROP INDEX IF EXISTS idx_rating_history_tournament;
DROP INDEX IF EXISTS idx_rating_history_match;
DROP INDEX IF EXISTS idx_rating_history_player;
DROP INDEX IF EXISTS idx_player_ratings_updated;
DROP INDEX IF EXISTS idx_player_ratings_rating;
DROP INDEX IF EXISTS idx_player_ratings_player_id;

-- Drop tables
DROP TABLE IF EXISTS rating_history;
DROP TABLE IF EXISTS player_ratings;

-- Confirmation message (in Supabase, you'll see this in the output)
SELECT 'Rollback completed: All Glicko-2 rating tables and policies have been removed.' AS status;
