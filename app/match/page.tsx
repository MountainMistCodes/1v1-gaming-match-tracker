"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BottomNav, PageHeader } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/image-upload"
import { cn } from "@/lib/utils"
import { Swords, Trophy, Loader2, Check, UserPlus } from "lucide-react"
import type { Player } from "@/lib/types"
import {
  generateMatchActivity,
  checkAndGenerateStreakActivity,
  checkAndGenerateRivalryActivity,
  checkAndGenerateMilestoneActivity,
  captureRankingSnapshot,
  generateRankUpActivitiesFromSnapshot,
} from "@/lib/activity-generator"
import { uploadImageToSupabase } from "@/lib/image-utils"

export default function RecordMatchPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [player1Id, setPlayer1Id] = useState<string>("")
  const [player2Id, setPlayer2Id] = useState<string>("")
  const [winnerId, setWinnerId] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [matchCount, setMatchCount] = useState<number | "">(1)

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    const supabase = createClient()
    const { data } = await supabase.from("players").select("*").order("name")
    setPlayers((data || []) as Player[])
    setIsLoading(false)
  }

  const player1 = players.find((p) => p.id === player1Id)
  const player2 = players.find((p) => p.id === player2Id)

  async function submitMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!player1Id || !player2Id || !winnerId) return

    setIsSubmitting(true)
    const supabase = createClient()
    const rankingSnapshot = await captureRankingSnapshot()

    let imageUrl: string | null = null
    if (imageBase64) {
      imageUrl = await uploadImageToSupabase(imageBase64, "matches")
    }

    const winner = players.find((p) => p.id === winnerId)!
    const loserId = winnerId === player1Id ? player2Id : player1Id
    const loser = players.find((p) => p.id === loserId)!

    const BATCH_SIZE = 500
    const matchData = {
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      notes: notes.trim() || null,
      image_url: imageUrl,
    }

    let allMatches: any[] = []
    let hasError = false

    // Insert in batches
    for (let i = 0; i < matchCount; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, matchCount - i)
      const batchInserts = Array(batchSize).fill(matchData)

      const { data: batchMatches, error } = await supabase.from("matches").insert(batchInserts).select()

      if (error) {
        console.error("Batch insert error:", error)
        hasError = true
        break
      }

      if (batchMatches) {
        allMatches = [...allMatches, ...batchMatches]
      }
    }

    if (!hasError && allMatches.length > 0) {
      // Generate activity for the batch (only one activity for all matches)
      await generateMatchActivity(
        allMatches[0].id,
        winner,
        loser,
        imageUrl,
        matchCount > 1 ? `${matchCount} برد متوالی - ${notes.trim() || ""}`.trim() : notes.trim() || null,
        matchCount,
      )

      await checkAndGenerateStreakActivity(winnerId)
      await checkAndGenerateRivalryActivity(player1Id, player2Id)
      await checkAndGenerateMilestoneActivity()
      await generateRankUpActivitiesFromSnapshot(rankingSnapshot)

      setShowSuccess(true)
      setTimeout(() => {
        setPlayer1Id("")
        setPlayer2Id("")
        setWinnerId("")
        setNotes("")
        setImageBase64(null)
        setMatchCount(1)
        setShowSuccess(false)
      }, 1500)
    }
    setIsSubmitting(false)
  }

  function resetForm() {
    setPlayer1Id("")
    setPlayer2Id("")
    setWinnerId("")
    setNotes("")
    setImageBase64(null)
    setMatchCount(1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (players.length < 2) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="ثبت مسابقه" />
        <div className="px-4 py-12 text-center">
          <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-lg font-semibold text-foreground mb-2">بازیکن کافی نیست</h2>
          <p className="text-muted-foreground mb-6">برای ثبت مسابقه حداقل ۲ بازیکن نیاز است</p>
          <Button onClick={() => router.push("/players")}>افزودن بازیکن</Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="ثبت مسابقه" subtitle="نتیجه مسابقه ۱ در مقابل ۱" />

      {showSuccess ? (
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">ثبت شد!</h2>
          <p className="text-muted-foreground">
            {matchCount > 1 ? `${matchCount} مسابقه با موفقیت ذخیره شد` : "مسابقه با موفقیت ذخیره شد"}
          </p>
        </div>
      ) : (
        <form onSubmit={submitMatch} className="px-4 py-6 space-y-6">
          {/* VS Section */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Player 1 */}
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-2 block">بازیکن ۱</label>
                <Select value={player1Id} onValueChange={setPlayer1Id}>
                  <SelectTrigger className="bg-secondary border-0 h-14 rounded-xl">
                    <SelectValue placeholder="انتخاب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((p) => p.id !== player2Id)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Swords className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground mt-1">VS</span>
              </div>

              {/* Player 2 */}
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-2 block">بازیکن ۲</label>
                <Select value={player2Id} onValueChange={setPlayer2Id}>
                  <SelectTrigger className="bg-secondary border-0 h-14 rounded-xl">
                    <SelectValue placeholder="انتخاب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((p) => p.id !== player1Id)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Winner Selection */}
          {player1Id && player2Id && (
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground block">برنده مسابقه</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWinnerId(player1Id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all duration-200",
                    winnerId === player1Id
                      ? "border-success bg-success/10"
                      : "border-border bg-card hover:border-muted-foreground/30",
                  )}
                >
                  <Trophy
                    className={cn(
                      "h-8 w-8 mx-auto mb-2",
                      winnerId === player1Id ? "text-success" : "text-muted-foreground",
                    )}
                  />
                  <p className={cn("font-semibold", winnerId === player1Id ? "text-success" : "text-foreground")}>
                    {player1?.name}
                  </p>
                  {winnerId === player1Id && <span className="text-xs text-success">برنده</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setWinnerId(player2Id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all duration-200",
                    winnerId === player2Id
                      ? "border-success bg-success/10"
                      : "border-border bg-card hover:border-muted-foreground/30",
                  )}
                >
                  <Trophy
                    className={cn(
                      "h-8 w-8 mx-auto mb-2",
                      winnerId === player2Id ? "text-success" : "text-muted-foreground",
                    )}
                  />
                  <p className={cn("font-semibold", winnerId === player2Id ? "text-success" : "text-foreground")}>
                    {player2?.name}
                  </p>
                  {winnerId === player2Id && <span className="text-xs text-success">برنده</span>}
                </button>
              </div>
            </div>
          )}

          {winnerId && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <label className="text-sm text-muted-foreground mb-3 block">تعداد برد</label>
              <div className="flex items-center justify-center gap-3">
                <Input
                  type="number"
                  min="1"
                  value={matchCount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      setMatchCount("")
                    } else {
                      const num = Number.parseInt(val, 10)
                      if (!isNaN(num) && num >= 1) {
                        setMatchCount(num)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      setMatchCount(1)
                    }
                  }}
                  className="w-24 h-14 text-center text-2xl font-bold bg-secondary border-0 rounded-xl text-primary"
                />
                <span className="text-muted-foreground">مسابقه</span>
              </div>
              {matchCount > 1 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {winnerId === player1Id ? player1?.name : player2?.name} {matchCount} بار برنده شد
                </p>
              )}
            </div>
          )}

          {/* Notes & Image */}
          {winnerId && (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">یادداشت (اختیاری)</label>
                <Input
                  placeholder="مثلا: بازی نزدیک، برگشت عالی..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary border-0 h-12 rounded-xl"
                />
              </div>

              <ImageUpload value={imageBase64} onChange={setImageBase64} />
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="flex-1 h-14 rounded-xl bg-transparent"
            >
              پاک کردن
            </Button>
            <Button
              type="submit"
              disabled={!player1Id || !player2Id || !winnerId || isSubmitting}
              className="flex-1 h-14 rounded-xl bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `ثبت ${matchCount > 1 ? `${matchCount} مسابقه` : "مسابقه"}`
              )}
            </Button>
          </div>
        </form>
      )}

      <BottomNav />
    </div>
  )
}
