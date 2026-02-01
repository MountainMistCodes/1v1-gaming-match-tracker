/**
 * Glicko-2 Rating System Implementation
 * Based on: https://www.glicko.net/glicko/glicko2.pdf
 *
 * Default parameters:
 * - Initial rating: 1500
 * - Initial RD (rating deviation): 350
 * - Initial volatility: 0.06
 * - Tau (volatility dampening): 0.5
 * - Rating period: one day
 */

export interface PlayerRating {
  rating: number
  rd: number // Rating Deviation
  volatility: number
}

export interface MatchResult {
  playerRating: PlayerRating
  opponentRating: number
  opponentRD: number
  result: number // 1 = win, 0.5 = draw, 0 = loss
}

const TAU = 0.5 // Volatility dampening factor
const SYSTEM_CONSTANT = 10.6 // For rating period ~30 days of inactivity
const Q = Math.log(10) / 400

// Convert rating to glicko scale (divide by 173.7178)
const g = (rd: number): number => {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / Math.PI / Math.PI)
}

// Expected score
const E = (playerRating: number, opponentRating: number, opponentRD: number): number => {
  return 1 / (1 + Math.pow(10, (-g(opponentRD) * (playerRating - opponentRating)) / 400))
}

// Calculate d-squared value
const calculateDSquared = (matches: MatchResult[]): number => {
  if (matches.length === 0) return 0

  let sum = 0
  for (const match of matches) {
    const oppGFunc = g(match.opponentRD)
    const expectedScore = E(match.playerRating.rating, match.opponentRating, match.opponentRD)
    sum += Math.pow(oppGFunc, 2) * expectedScore * (1 - expectedScore)
  }

  return 1 / (Q * Q * sum)
}

// Calculate preliminary rating
const calculatePreliminaryRating = (
  currentRating: number,
  matches: MatchResult[],
  dSquared: number,
): number => {
  if (matches.length === 0) return currentRating

  let sum = 0
  for (const match of matches) {
    const oppGFunc = g(match.opponentRD)
    const expectedScore = E(currentRating, match.opponentRating, match.opponentRD)
    sum += oppGFunc * (match.result - expectedScore)
  }

  return currentRating + (Q / (1 / dSquared + 1 / Math.pow(matches[0].playerRating.rd, 2))) * sum
}

// Iterative volatility calculation
const calculateVolatility = (
  volatility: number,
  rating: number,
  rd: number,
  matches: MatchResult[],
  dSquared: number,
): number => {
  const a = Math.log(Math.pow(volatility, 2))
  const x0 = a

  // f(x) function for finding volatility
  const f = (x: number): number => {
    const expx = Math.exp(x)
    let sum = 0

    for (const match of matches) {
      const oppGFunc = g(match.opponentRD)
      const expectedScore = E(rating, match.opponentRating, match.opponentRD)
      sum += Math.pow(oppGFunc, 2) * Math.pow(match.result - expectedScore, 2)
    }

    return (
      (expx * (sum - dSquared)) / (2 * Math.pow(dSquared, 2)) -
      (x - a) / Math.pow(TAU, 2)
    )
  }

  // Derivative of f(x)
  const dfDx = (x: number): number => {
    const expx = Math.exp(x)
    let sum = 0

    for (const match of matches) {
      const oppGFunc = g(match.opponentRD)
      const expectedScore = E(rating, match.opponentRating, match.opponentRD)
      sum += Math.pow(oppGFunc, 2) * Math.pow(match.result - expectedScore, 2)
    }

    return (
      (expx * (sum - dSquared)) / Math.pow(dSquared, 2) - 1 / Math.pow(TAU, 2)
    )
  }

  // Newton's method for finding root
  let x = x0
  let prev_x = x0
  for (let i = 0; i < 100; i++) {
    const numerator = f(x)
    const denominator = dfDx(x)

    if (Math.abs(denominator) < 1e-10) break

    x = x - numerator / denominator

    if (Math.abs(x - prev_x) < 1e-6) break
    prev_x = x
  }

  return Math.exp(x / 2)
}

// Calculate new rating deviation
const calculateNewRD = (rd: number, matches: MatchResult[], newVolatility: number): number => {
  const rdSquaredInverse = 1 / Math.pow(rd, 2) + 1 / calculateDSquared(matches)
  return Math.sqrt(1 / rdSquaredInverse)
}

// Handle inactivity decay
const applyInactivityDecay = (rating: PlayerRating, periodsSinceUpdate: number): PlayerRating => {
  const maxRD = 350
  let newRD = Math.sqrt(Math.pow(rating.rd, 2) + Math.pow(rating.volatility, 2) * periodsSinceUpdate)

  // Cap RD at max value
  if (newRD > maxRD) {
    newRD = maxRD
  }

  return {
    rating: rating.rating,
    rd: newRD,
    volatility: rating.volatility,
  }
}

/**
 * Main Glicko-2 update function
 * @param currentRating Current player rating data
 * @param matches Array of match results in this rating period
 * @returns Updated rating data
 */
export const updateRating = (
  currentRating: PlayerRating,
  matches: MatchResult[],
): PlayerRating => {
  if (matches.length === 0) {
    return currentRating
  }

  const dSquared = calculateDSquared(matches)
  const preliminaryRating = calculatePreliminaryRating(
    currentRating.rating,
    matches,
    dSquared,
  )
  const newVolatility = calculateVolatility(
    currentRating.volatility,
    currentRating.rating,
    currentRating.rd,
    matches,
    dSquared,
  )
  const newRD = calculateNewRD(currentRating.rd, matches, newVolatility)

  return {
    rating: preliminaryRating,
    rd: newRD,
    volatility: newVolatility,
  }
}

/**
 * Get default rating for new players
 */
export const getDefaultRating = (): PlayerRating => ({
  rating: 1500,
  rd: 350,
  volatility: 0.06,
})

/**
 * Calculate expected score between two players
 */
export const getExpectedScore = (
  playerRating: number,
  opponentRating: number,
  opponentRD: number,
): number => {
  return E(playerRating, opponentRating, opponentRD)
}

/**
 * Calculate rating impact of a match result
 */
export const calculateRatingChange = (
  currentRating: PlayerRating,
  opponentRating: number,
  opponentRD: number,
  result: number, // 1 = win, 0.5 = draw, 0 = loss
): number => {
  const match: MatchResult = {
    playerRating: currentRating,
    opponentRating,
    opponentRD,
    result,
  }

  const updated = updateRating(currentRating, [match])
  return updated.rating - currentRating.rating
}
