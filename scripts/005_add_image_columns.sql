-- Add image_url column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to tournaments table  
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to activities metadata (already jsonb, no change needed)
