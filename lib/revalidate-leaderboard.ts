export async function revalidateLeaderboardCache() {
  try {
    await fetch("/api/revalidate/leaderboard", {
      method: "POST",
      cache: "no-store",
    })
  } catch (error) {
    console.error("Failed to revalidate leaderboard cache:", error)
  }
}
