# Glicko-2 Rating System Setup Guide

## Step-by-Step Instructions

### Step 1: Create Database Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire content from `scripts/008_create_player_ratings.sql`
5. Click **Run** to execute the SQL

**What this creates:**
- `player_ratings` table - stores current Glicko-2 ratings
- `rating_history` table - audit trail of all rating changes
- Indexes for fast lookups
- RLS policies for public access

### Step 2: Execute the Rating Migration

Once the tables are created, go to:
```
http://yoursite.com/admin/migrate
```

Or if you want to call the API directly:
```bash
curl -X POST https://yoursite.com/api/admin/migrate-ratings
```

This will:
1. Initialize all players with default ratings (1500)
2. Process all historical matches in chronological order
3. Process tournament placements (1st, 2nd, 3rd place)
4. Return the top 20 players with their new ratings

### Step 3: Verify the Rankings

After migration completes:
- Check the homepage "Top Players" section - should show Glicko-2 ratings
- Visit `/leaderboard` - should display full ranking list

## What's Different from Old System

**Old System:**
- Based purely on win percentage
- Didn't consider opponent strength
- No inactivity factor
- Simple tournament bonus

**New System (Glicko-2):**
- Considers opponent rating when calculating changes
- Higher-rated opponents = bigger gains/losses
- Inactivity increases uncertainty (RD)
- Tournament placements 1-3 get positive rating gains
- 4th place and below = no rating change
- Tracks rating volatility for stability assessment

## Rating Points for Tournaments

| Placement | Rating Change |
|-----------|---------------|
| 1st Place | Win vs strong opponent (+150 rating) |
| 2nd Place | Win vs moderate opponent (+50 rating) |
| 3rd Place | Win vs average opponent (0-20 rating) |
| 4th+ Place | No rating change |

## Troubleshooting

**Error: "Could not find the table 'public.player_ratings'"**
- Solution: Run the SQL script from Step 1 first

**Error: "Migration failed"**
- Check server logs at `/api/admin/migrate-ratings`
- Ensure all players exist in the `players` table
- Verify match and tournament_placements data is valid

**Ratings not updating after new matches**
- The migration is a one-time calculation
- For ongoing updates, use the rating-calculator module when recording matches/tournaments
