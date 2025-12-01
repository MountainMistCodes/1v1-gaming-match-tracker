-- Add avatar_url column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
