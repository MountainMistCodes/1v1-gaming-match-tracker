import { BottomNav, PageHeader } from "@/components/navigation"
import { LeaderboardClient } from "@/components/leaderboard-client"
import { rankPlayers } from "@/lib/ranking"
import { getLeaderboardSnapshot } from "@/lib/leaderboard-snapshot"

export const revalidate = 60

export default async function LeaderboardPage() {
  const { players, matches, placements } = await getLeaderboardSnapshot()
  const rankings = rankPlayers(players, matches, placements)

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="جدول امتیازات" subtitle="رتبه‌بندی کلی بازیکنان" />
      <LeaderboardClient rankings={rankings} />
      <BottomNav />
    </div>
  )
}
