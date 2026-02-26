"use client"

import { Info, Medal } from "lucide-react"
import { PlayerCard } from "@/components/player-card"
import type { PlayerStats } from "@/lib/types"

interface LeaderboardClientProps {
  rankings: PlayerStats[]
}

export function LeaderboardClient({ rankings }: LeaderboardClientProps) {
  return (
    <div className="px-4 py-4">
      <div className="bg-card/50 border border-border rounded-xl p-3 mb-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          رتبه‌بندی بر اساس درصد برد تعدیل‌شده، قدرت حریفان و پاداش تورنمنت است؛ مقام اول تورنمنت +۵ برد معادل و
          مقام دوم +۲ برد معادل می‌گیرد.
        </p>
      </div>

      {rankings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>هنوز بازیکنی ثبت نشده است.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rankings.map((stats, index) => (
            <PlayerCard key={stats.player.id} stats={stats} rank={index + 1} showRank />
          ))}
        </div>
      )}
    </div>
  )
}
