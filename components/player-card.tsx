import Link from "next/link"
import { cn } from "@/lib/utils"
import { Trophy, ChevronLeft, User, Info } from "lucide-react"
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
  const { player, totalWins, totalLosses, netWinRate, tournamentWins } = stats

  return (
    <Link
      href={`/players/${player.id}`}
      className="block rounded-2xl bg-card border border-border p-4 transition-all duration-200 hover:border-muted-foreground/30 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showRank && rank && (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
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

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{player.name}</h3>
              {tournamentWins > 0 && (
                <div className="flex items-center gap-1 text-gold">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{tournamentWins}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm">
                <span className="text-success font-medium">{totalWins}</span>
                <span className="text-muted-foreground"> - </span>
                <span className="text-destructive font-medium">{totalLosses}</span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                      ({netWinRate.toFixed(1)}%)
                      <Info className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">میزان برتری</p>
                    <p>برای حریفان قوی‌تر: +</p>
                    <p>برای حریفان ضعیف‌تر: −</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  )
}
