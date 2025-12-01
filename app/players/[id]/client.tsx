"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BottomNav } from "@/components/navigation"
import { StatsCard } from "@/components/stats-card"
import { PlayerEditModal } from "@/components/player-edit-modal"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  Trophy,
  Swords,
  Target,
  TrendingUp,
  TrendingDown,
  Medal,
  Award,
  User,
  Pencil,
} from "lucide-react"
import type { Player, Match, TournamentPlacement, HeadToHead } from "@/lib/types"

interface PlayerProfileClientProps {
  player: Player
  matches: Match[]
  placements: TournamentPlacement[]
  headToHead: HeadToHead[]
  totalWins: number
  totalLosses: number
  winPercentage: number
  tournamentWins: number
}

export function PlayerProfileClient({
  player: initialPlayer,
  matches,
  placements,
  headToHead,
  totalWins,
  totalLosses,
  winPercentage,
  tournamentWins,
}: PlayerProfileClientProps) {
  const [player, setPlayer] = useState(initialPlayer)
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background px-4 pt-6 pb-6">
        <Link
          href="/players"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
          بازگشت
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setIsEditOpen(true)} className="relative group">
            {player.avatar_url ? (
              <Image
                src={player.avatar_url || "/placeholder.svg"}
                alt={player.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="h-5 w-5 text-white" />
            </div>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{player.name}</h1>
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {tournamentWins > 0 && (
              <div className="flex items-center gap-1 text-gold mt-1">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">{tournamentWins} قهرمانی</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard title="برد" value={totalWins} icon={TrendingUp} variant="success" />
          <StatsCard title="باخت" value={totalLosses} icon={TrendingDown} variant="default" />
          <StatsCard title="کل مسابقات" value={matches.length} icon={Swords} variant="primary" />
          <StatsCard title="درصد برد" value={`${winPercentage.toFixed(0)}%`} icon={Target} variant="accent" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Tournament History */}
        {placements.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">تورنمنت‌ها</h2>
            </div>
            <div className="space-y-2">
              {placements.map((placement) => (
                <div key={placement.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{placement.tournament?.name}</h3>
                      <p className="text-xs text-muted-foreground">{placement.tournament?.game_type || "تورنمنت"}</p>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                        placement.placement === 1 && "bg-gold/20 text-gold",
                        placement.placement === 2 && "bg-silver/20 text-silver",
                        placement.placement === 3 && "bg-bronze/20 text-bronze",
                        placement.placement > 3 && "bg-secondary text-muted-foreground",
                      )}
                    >
                      {placement.placement === 1 && <Medal className="h-4 w-4" />}
                      {placement.placement === 2 && <Award className="h-4 w-4" />}#{placement.placement}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Head to Head */}
        {headToHead.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Swords className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">رودررو</h2>
            </div>
            <div className="space-y-2">
              {headToHead.map((h2h) => {
                const isWinning = h2h.wins > h2h.losses
                const isLosing = h2h.losses > h2h.wins
                const ratio = h2h.total >= 5 ? (isLosing ? h2h.losses / h2h.wins : h2h.wins / h2h.losses) : 0
                const isNemesis = isLosing && ratio >= 2
                const isDominating = isWinning && ratio >= 2

                return (
                  <Link
                    key={h2h.opponent.id}
                    href={`/players/${h2h.opponent.id}`}
                    className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-muted-foreground/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {h2h.opponent.avatar_url ? (
                        <Image
                          src={h2h.opponent.avatar_url || "/placeholder.svg"}
                          alt={h2h.opponent.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <span className="font-medium text-foreground">{h2h.opponent.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-foreground">{h2h.opponent.name}</h3>
                        {isNemesis && <span className="text-xs text-destructive">نمسیس!</span>}
                        {isDominating && <span className="text-xs text-success">تسلط کامل</span>}
                      </div>
                    </div>
                    <div className="text-left">
                      <span
                        className={cn(
                          "font-bold",
                          isWinning && "text-success",
                          isLosing && "text-destructive",
                          !isWinning && !isLosing && "text-foreground",
                        )}
                      >
                        {h2h.wins} - {h2h.losses}
                      </span>
                      <p className="text-xs text-muted-foreground">{h2h.total} بازی</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Recent Matches */}
        {matches.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">مسابقات اخیر</h2>
            <div className="space-y-2">
              {matches.slice(0, 10).map((match) => {
                const opponent = match.player1_id === player.id ? match.player2 : match.player1
                const won = match.winner_id === player.id

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-8 rounded-full", won ? "bg-success" : "bg-destructive")} />
                      <div>
                        <p className="font-medium text-foreground">vs {opponent?.name}</p>
                        {match.notes && <p className="text-xs text-muted-foreground">{match.notes}</p>}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={cn("text-sm font-medium", won ? "text-success" : "text-destructive")}>
                        {won ? "برد" : "باخت"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(match.played_at).toLocaleDateString("fa-IR")}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {matches.length === 0 && placements.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Swords className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>هنوز مسابقه‌ای ثبت نشده</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <PlayerEditModal player={player} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={setPlayer} />

      <BottomNav />
    </div>
  )
}
