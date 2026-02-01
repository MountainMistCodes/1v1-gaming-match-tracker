# Glicko-2 Ranking System Migration Guide

## Overview
This guide walks you through migrating from the old win/loss percentage system to the new Glicko-2 rating system. All historical data is preserved in a backup.

## Step 1: Backup Current Database

Before making any changes, create a backup of the current database with the name "oldranking":

**In Supabase:**
1. Go to Project Settings → Backups
2. Click "Create a backup" 
3. Name it: `oldranking` (for preservation of current ranking state)

Alternatively, you can export the current data:
```sql
-- This exports all current rankings for reference
SELECT p.id, p.name, 
  COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) as wins,
  COUNT(CASE WHEN m.player1_id = p.id OR m.player2_id = p.id THEN 1 END) - 
  COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) as losses
FROM players p
LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id)
GROUP BY p.id, p.name
ORDER BY wins DESC;
```

## Step 2: Create New Database Tables

Run the migration script to create the new schema:

**Execute in Supabase SQL Editor:**
```sql
-- Run the complete script from:
-- scripts/008_create_player_ratings.sql
```

This creates:
- `player_ratings` - Stores current Glicko-2 ratings
- `rating_history` - Tracks all rating changes for analytics

## Step 3: Initialize Player Ratings

Run this initialization script to set up all existing players with default Glicko-2 ratings:

```sql
-- Initialize all players with default Glicko-2 parameters
INSERT INTO player_ratings (player_id, rating, rating_deviation, volatility)
SELECT id, 1500, 350, 0.06
FROM players
ON CONFLICT (player_id) DO NOTHING;
```

## Step 4: Recalculate Historical Ratings

The migration process recalculates all historical matches and tournaments to compute fair Glicko-2 ratings:

### For 1v1 Matches:
```sql
-- This shows which matches will be processed
SELECT COUNT(*) as total_matches,
  SUM(CASE WHEN winner_id IS NOT NULL THEN 1 ELSE 0 END) as matches_with_winner
FROM matches
ORDER BY played_at ASC;
```

### For Tournament Placements:
```sql
-- This shows tournament placements that will be scored
SELECT t.id, t.name, COUNT(tp.id) as participants,
  SUM(CASE WHEN tp.placement <= 3 THEN 1 ELSE 0 END) as scored_placements
FROM tournaments t
LEFT JOIN tournament_placements tp ON t.id = tp.tournament_id
GROUP BY t.id, t.name;
```

## Step 5: Run Migration via Application

The application provides a migration endpoint to recalculate all ratings:

```bash
# In your application code (to be implemented in app/api/admin/migrate-ratings/route.ts)
POST /api/admin/migrate-ratings

# This will:
# 1. Initialize all players with default Glicko-2 ratings
# 2. Process all historical matches in chronological order
# 3. Process all tournament placements
# 4. Generate rating history entries
```

## Step 6: Verify New Ratings

Check that the migration was successful:

```sql
-- View new player ratings
SELECT p.id, p.name, 
  pr.rating, 
  pr.rating_deviation,
  pr.volatility,
  pr.last_rating_update
FROM players p
LEFT JOIN player_ratings pr ON p.id = pr.player_id
ORDER BY pr.rating DESC
LIMIT 20;

-- Compare rating changes from rating history
SELECT 
  player_id,
  COUNT(*) as total_updates,
  MIN(rating_before) as min_rating,
  MAX(rating_after) as max_rating,
  SUM(rating_change) as total_rating_change
FROM rating_history
GROUP BY player_id
ORDER BY total_rating_change DESC;
```

## Understanding Glicko-2 Parameters

### Rating (1500 default)
- Represents player skill level
- Higher = stronger player
- Influenced by match results and opponent strength
- Roughly equivalent to previous win percentage but more sophisticated

### Rating Deviation (RD) - starts at 350
- Measures confidence in the rating
- Lower RD = more confident in the rating
- Increases over time when player is inactive
- Decreases when player plays matches
- Used in calculations to weight match importance

### Volatility - starts at 0.06
- Measures rating stability
- Higher volatility = more unpredictable performance
- Adjusted based on rating change magnitude
- Used to prevent extreme rating swings

## Tournament Placement Scoring

### How Placements Convert to Ratings:

**1st Place:**
- Treated as win against opponent rated ~200 points above average
- Large rating gain (typically +20 to +50 depending on field strength)
- Volatility decreases (more consistent performance)

**2nd Place:**
- Treated as draw against average field
- Neutral rating change (typically -2 to +5)
- Reflects competitive but not winning performance

**3rd Place:**
- Treated as loss against opponent rated ~200 points below average
- Modest rating loss (typically -10 to +10)
- Reflects participation bonus for top 3

**Below 3rd Place:**
- No rating impact
- Historical data preserved for future analysis
- Encourages participation without heavy penalty

## API Integration

Update your match submission to trigger rating updates:

```typescript
// In your API route handler
import { processMatchRating } from "@/lib/rating-calculator"

// When a match is created
const result = await processMatchRating(
  supabase,
  matchId,
  winnerId,
  loserId
)

console.log(`${winnerId}: ${result.winner.ratingChange > 0 ? '+' : ''}${result.winner.ratingChange.toFixed(1)}`)
console.log(`${loserId}: ${result.loser.ratingChange > 0 ? '+' : ''}${result.loser.ratingChange.toFixed(1)}`)
```

## Rollback Plan

If you need to revert to the old system:

1. **Full Rollback:** Restore from the "oldranking" backup
2. **Partial Rollback:** Keep rating_history for analytics, revert display logic to win/loss calculation

## Key Differences from Old System

| Aspect | Old System | Glicko-2 |
|--------|-----------|----------|
| Calculation | Win % = Wins / Total | Complex Glicko-2 algorithm |
| Opponent Strength | Ignored | Heavily weighted |
| Inactivity | No penalty | RD increases (rating less certain) |
| Tournament Impact | Equal to 1 match | Multiple virtual matches |
| Stability | Volatile swings | Controlled by volatility parameter |
| Ranking Confidence | None | RD indicates confidence level |

## Questions?

For detailed Glicko-2 documentation:
- Official Paper: https://www.glicko.net/glicko/glicko2.pdf
- Implementation: See `lib/glicko2-engine.ts`
