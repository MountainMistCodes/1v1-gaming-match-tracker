import Link from "next/link"
import Image from "next/image"
import { Award, Crown, Trophy } from "lucide-react"
import { ActionCard } from "@/components/action-card"
import { ActivityFeed } from "@/components/activity-feed"
import { BottomNav } from "@/components/navigation"
import { PlayerCard } from "@/components/player-card"
import { StatsCard } from "@/components/stats-card"
import { VersionHint } from "@/components/version-hint"
import { calculatePlayerOfMonth } from "@/lib/player-of-month"
import { rankPlayers } from "@/lib/ranking"
import { getLeaderboardSnapshot } from "@/lib/leaderboard-snapshot"
import { createClient } from "@/lib/supabase/server"
import type { Activity } from "@/lib/types"

export const revalidate = 60
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"

async function getDashboardData() {
  const supabase = await createClient()
  const fetchActivities = async () => {
    try {
      return await supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(10)
    } catch (error) {
      console.error("[home] Failed to load activities", error)
      return { data: [] as Activity[] }
    }
  }

  const [snapshot, activitiesRes] = await Promise.all([
    getLeaderboardSnapshot().catch((error) => {
      console.error("[home] Failed to load leaderboard snapshot", error)
      return { players: [], matches: [], placements: [], tournaments: [] }
    }),
    fetchActivities(),
  ])

  return {
    ...snapshot,
    activities: (activitiesRes.data || []) as Activity[],
  }
}

export const metadata = {
  title: "بلک لیست - صفحه‌ی اصلی",
  description: "ثبت نتایج مسابقات گیمینگ و رتبه‌بندی بازیکنان",
}

export default async function HomePage() {
  const { players, matches, placements, tournaments, activities } = await getDashboardData()
  const rankings = rankPlayers(players, matches, placements)
  const playerOfMonth = calculatePlayerOfMonth(players, matches, placements, tournaments)
  const topPlayers = rankings.slice(0, 3)
  const totalMatches = matches.length
  const tournamentsCount = tournaments.length

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary/20 to-background px-4 pb-6 pt-8">
        <div className="mb-6">
          <VersionHint version={APP_VERSION}>
            <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-2xl">
            <Image src="/logo.png" alt="بلک لیست" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">بلک لیست</h1>
            <p className="text-sm text-muted-foreground">ثبت نتایج مسابقات گیمینگ</p>
          </div>
            </div>
          </VersionHint>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatsCard title="بازیکنان" value={players.length} iconName="users" variant="primary" />
          <StatsCard title="مسابقات" value={totalMatches} iconName="swords" variant="accent" />
          <StatsCard title="تورنمنت‌ها" value={tournamentsCount} iconName="trophy" variant="success" />
        </div>
      </div>

      <div className="space-y-6 px-4 py-6">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">دسترسی سریع</h2>
          <div className="grid grid-cols-2 gap-2">
            <ActionCard href="/match" title="ثبت مسابقه" iconName="swords" variant="primary" />
            <ActionCard href="/tournament" title="تورنمنت جدید" iconName="trophy" variant="accent" />
            <ActionCard href="/players" title="بازیکنان" iconName="users" />
            <ActionCard href="/leaderboard" title="جدول امتیازات" iconName="medal" />
          </div>
        </section>

        {playerOfMonth && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-foreground">بازیکن ماه</h2>
            </div>
            <Link
              href={`/players/${playerOfMonth.player.id}`}
              className="block rounded-2xl border border-gold/35 bg-gold/10 p-4 transition-colors hover:bg-gold/15"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{playerOfMonth.player.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {playerOfMonth.totalWins} برد از {playerOfMonth.totalMatches} مسابقه •{" "}
                    {playerOfMonth.winPercentage.toFixed(0)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {playerOfMonth.tournamentWins} قهرمانی ماهانه • امتیاز ماه: {playerOfMonth.monthlyScore}
                  </p>
                </div>
                <Trophy className="h-6 w-6 shrink-0 text-gold" />
              </div>
            </Link>
          </section>
        )}

        {topPlayers.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-foreground">برترین‌ها</h2>
            </div>
            <div className="space-y-2">
              {topPlayers.map((stats, index) => (
                <PlayerCard key={stats.player.id} stats={stats} rank={index + 1} showRank />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">اخبار و فعالیت‌ها</h2>
          <ActivityFeed initialActivities={activities} limit={10} showFilters showNotificationToggle />
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
