# Glicko-2 Ranking System Implementation Plan

## Overview
Implementing a Glicko-2 rating system to replace the current win/loss percentage calculation. This provides a more robust ranking that considers opponent strength, inactivity, and tournament placement.

## Why Glicko-2?
- **Accounts for opponent strength**: Beating strong players increases rating more than beating weak players
- **Handles uncertainty**: Tracks rating deviation (RD) to measure confidence in player skill
- **Inactivity decay**: Ratings naturally decay when players are inactive (RD increases)
- **Tournament support**: Can assign virtual match results from tournament placements
- **More stable**: Reduces rating volatility compared to simple win/loss ratios

## Database Schema Changes

### New Tables
1. **player_ratings** - Stores Glicko-2 ratings
   - player_id (UUID)
   - rating (FLOAT) - Default: 1500
   - rating_deviation (FLOAT) - Default: 350
   - volatility (FLOAT) - Default: 0.06
   - last_rating_update (TIMESTAMP)
   - tournament_rating (FLOAT) - For tournament-specific tracking
   - created_at (TIMESTAMP)

### Modified Tables
- **matches** - Add `rating_change` field to track rating impact

## Implementation Strategy

### Phase 1: Database Setup
- Create `player_ratings` table with indexes
- Back up current data (named 'oldranking')
- Initialize all players with default Glicko-2 parameters

### Phase 2: Glicko-2 Engine
- Implement core Glicko-2 calculation functions
- Handle match results (1v1)
- Handle tournament placements (virtual matches)

### Phase 3: Migration
- Recalculate all historical matches and tournaments
- Preserve all data in `oldranking` backup
- Generate new ratings based on complete history

### Phase 4: Integration
- Update leaderboard queries
- Display rating changes alongside rankings
- Add rating deviation indicator

## Glicko-2 Tournament Placement Scoring

### Placement to Virtual Match Mapping
- **1st Place**: Considered a win against average field
- **2nd Place**: 50% win probability (draw-like)
- **3rd Place**: Considered a loss against average field
- **Below 3rd**: No rating impact (historical tracking only)

### Tournament Scoring Algorithm
```
For each player in top 3 placements:
1. Calculate average rating of tournament field
2. Assign virtual match outcome:
   - 1st: Win with rating = (avg_field_rating + 200)
   - 2nd: Draw-equivalent with rating = avg_field_rating
   - 3rd: Loss with rating = (avg_field_rating - 200)
3. Update player rating with single match result
```

## Data Preservation
- All historical matches and tournaments remain unchanged
- `oldranking` backup preserves original schema
- New `player_ratings` table coexists with existing data
- Leaderboard switches to Glicko-2 ratings, historical data stays intact

## Implementation Files
1. `scripts/008_create_player_ratings.sql` - Schema creation
2. `scripts/009_migrate_to_glicko2.sql` - Data migration
3. `lib/glicko2-engine.ts` - Core calculations
4. `lib/rating-calculator.ts` - Tournament & match processors
