# Fair Rating System - Plan & Implementation

## Overview
A simplified but fair rating system that rewards competitive play while maintaining simplicity. No UI/data changes needed - all calculations happen behind the scenes using existing database.

## Core Principles
1. **Opponent Strength Matters**: Beating stronger players = more points. Beating weaker players = fewer points.
2. **Tournament Rewards**: 1st/2nd/3rd all get fair bonus points, scaled appropriately.
3. **Loss Penalties Scale**: Losing to weaker players costs more points than losing to stronger players.
4. **10-Game Minimum**: Players need ≥10 games to appear in rankings (confidence threshold).

---

## System Architecture

### 1. Player Rating Score (Base Points)
Each player has a **base rating score** calculated from:
- Win/Loss record against opponents of different ranks
- Tournament placement bonuses
- Minimum games played

**Formula Components:**
```
Final Rating = (Base Win-Loss Score) + (Tournament Bonus) + (Confidence Adjustment)
```

### 2. Match Point Calculation (1v1)

**For each 1v1 match:**
- Get both players' current rank positions (1=strongest, n=weakest)
- Calculate point swing based on rank difference

**Winner Gets:**
- Beating rank #1: +50 points (major achievement)
- Beating rank #5: +40 points
- Beating rank #10: +30 points  
- Beating rank #20: +15 points
- Beating rank #50+: +10 points (floor)

**Loser Loses:**
- Rank #1 loses to rank #50: -50 points (huge upset)
- Rank #1 loses to rank #10: -20 points
- Rank #5 loses to rank #50: -25 points (upset)
- Rank #50 loses to rank #1: -5 points (expected)

**Logic:**
```
pointChange = BASE_POINTS - (opponentRankPosition × RANK_PENALTY_MULTIPLIER)
winnerGains = max(10, pointChange)  // Minimum 10 points
loserLoses = -(max(5, pointChange)) // Minimum -5 points
```

### 3. Tournament Point Calculation

**For each tournament placement:**
- 1st place: +40 points (flat bonus, no scaling)
- 2nd place: +20 points (fair reward)
- 3rd place: +10 points (participation bonus)
- 4th+: 0 points (no penalty, just participation)

### 4. Confidence Factor (Min 10 Games)

```
if (totalMatches < 10) {
  // Scale rating down toward 50 (neutral)
  confidenceFactor = totalMatches / 10
  adjustedRating = 50 + ((rating - 50) × confidenceFactor)
}
```

This prevents new players from ranking high on lucky streaks.

---

## Data Model
**NO database changes needed.** We calculate everything from existing tables:
- `players` table
- `matches` table (has winner_id, player1_id, player2_id)
- `tournament_placements` table (has placement, player_id)

### Internal Calculation (No storage)
- Ranking scores are calculated on-the-fly
- Players sorted by final rating score
- Shown same way as before (no UI changes)

---

## Implementation Steps

### Step 1: Create Rating Calculator Utility
File: `lib/rating-calculator.ts`
- `calculatePlayerRating()` - Get rating for one player
- `calculateAllRatings()` - Get ratings for all players
- `getRankPosition()` - Get player's rank
- `calculateMatchPoints()` - Get points from a match

### Step 2: Update Ranking Functions
File: `app/leaderboard/page.tsx`
- Replace `calculateRankingScore()` with new function
- Update `calculateStats()` to use new logic
- Keep UI identical

### Step 3: Update Homepage
File: `app/page.tsx`
- Use same new rating functions
- UI stays identical

---

## Benefits of This Approach
✅ **Fair**: Opponent strength considered in all calculations
✅ **Simple**: Easy to understand point mechanics
✅ **No Data Loss**: Uses existing data, no migrations needed
✅ **No UI Changes**: Same leaderboard display
✅ **Abuse Prevention**: Lower-ranked wins against higher-ranked don't abuse the system
✅ **Scalable**: Works for any number of players

---

## Example Scenarios

### Scenario 1: Rank #1 vs Rank #100
- Rank #1 wins: +10 points (expected, low reward)
- Rank #1 loses: -50 points (huge upset, big penalty)
- Rank #100 wins: +50 points (major upset, high reward)
- Rank #100 loses: -5 points (expected, low penalty)

### Scenario 2: Tournament
- 1st place player: existing rating + 40 bonus points
- 2nd place player: existing rating + 20 bonus points
- 3rd place player: existing rating + 10 bonus points

### Scenario 3: New Player (3 wins, 2 losses)
- Raw win rate: 60%
- Confidence factor: 3/10 = 0.3
- Adjusted rating: 50 + ((60 - 50) × 0.3) = 53
- Won't rank above players with 10+ games at 51% win rate
