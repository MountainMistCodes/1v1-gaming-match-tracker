import Link from "next/link"
import { cn } from "@/lib/utils"
import { Trophy, ChevronLeft, User } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { PlayerStats } from "@/lib/types"

interface PlayerCardProps {
  stats: PlayerStats
  rank?: number
  showRank?: boolean
}

export function PlayerCard({ stats, rank, showRank = false }: PlayerCardProps) {
  const { player, totalWins, totalLosses, winPercentage, tournamentWins, rankingScore } = stats

  return (
    <Link
      href={`/players/${player.id}`}
      className="block rounded-2xl bg-card border border-border p-4 transition-all duration-200 hover:border-muted-foreground/30 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {showRank && rank && (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                rank === 1 && "bg-gold/20 text-gold",
                rank === 2 && "bg-silver/20 text-silver",
                rank === 3 && "bg-bronze/20 text-bronze",
                rank > 3 && "bg-secondary text-muted-foreground",
              )}
            >
              {rank}
            </div>
          )}

          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            {player.avatar_url ? (
              <img
                src={player.avatar_url || "/placeholder.svg"}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{player.name}</h3>
              {tournamentWins > 0 && (
                <div className="flex items-center gap-1 text-gold flex-shrink-0">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{tournamentWins}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">
                <span className="text-success font-medium">{totalWins}</span>
                <span className="text-muted-foreground"> - </span>
                <span className="text-destructive font-medium">{totalLosses}</span>
              </span>
              <span className="text-xs text-muted-foreground">({winPercentage.toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {rankingScore !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground">
                    {rankingScore.toFixed(1)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p> امتیاز محاسبه شده</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}
