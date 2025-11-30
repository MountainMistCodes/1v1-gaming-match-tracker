"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BottomNav, PageHeader } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShamsiDatePicker } from "@/components/shamsi-date-picker"
import { ImageUpload } from "@/components/image-upload"
import { cn } from "@/lib/utils"
import { Trophy, Plus, X, Loader2, Check, UserPlus, Medal, Award } from "lucide-react"
import type { Player } from "@/lib/types"
import { generateTournamentActivity, checkAndGenerateMilestoneActivity } from "@/lib/activity-generator"
import { uploadImageToSupabase } from "@/lib/image-utils"

interface Placement {
  position: number
  playerId: string
}

const gameTypes = ["FIFA", "PES", "Street Fighter", "Mortal Kombat", "Tekken", "Call of Duty", "Fortnite", "سایر"]

export default function TournamentPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState("")
  const [gameType, setGameType] = useState("PES")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [placements, setPlacements] = useState<Placement[]>([
    { position: 1, playerId: "" },
    { position: 2, playerId: "" },
    { position: 3, playerId: "" },
  ])
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    const supabase = createClient()
    const { data } = await supabase.from("players").select("*").order("name")
    setPlayers((data || []) as Player[])
    setIsLoading(false)
  }

  const selectedPlayerIds = placements.map((p) => p.playerId).filter(Boolean)

  function updatePlacement(position: number, playerId: string) {
    setPlacements((prev) => prev.map((p) => (p.position === position ? { ...p, playerId } : p)))
  }

  function addPlacement() {
    const nextPosition = placements.length + 1
    setPlacements((prev) => [...prev, { position: nextPosition, playerId: "" }])
  }

  function removePlacement(position: number) {
    if (placements.length <= 1) return
    setPlacements((prev) => prev.filter((p) => p.position !== position).map((p, i) => ({ ...p, position: i + 1 })))
  }

  async function submitTournament(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !placements[0]?.playerId) return

    setIsSubmitting(true)
    const supabase = createClient()

    let imageUrl: string | null = null
    if (imageBase64) {
      imageUrl = await uploadImageToSupabase(supabase, imageBase64, "tournaments")
    }

    // Create tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        name: name.trim(),
        game_type: gameType || null,
        tournament_date: date,
        image_url: imageUrl, // Save image URL
      })
      .select()
      .single()

    if (tournamentError || !tournament) {
      setIsSubmitting(false)
      return
    }

    // Create placements
    const validPlacements = placements.filter((p) => p.playerId)
    const { error: placementsError } = await supabase.from("tournament_placements").insert(
      validPlacements.map((p) => ({
        tournament_id: tournament.id,
        player_id: p.playerId,
        placement: p.position,
      })),
    )

    if (!placementsError) {
      const placementsWithPlayers = validPlacements.map((p) => ({
        position: p.position,
        player: players.find((pl) => pl.id === p.playerId)!,
      }))

      await generateTournamentActivity(tournament.id, name.trim(), placementsWithPlayers, imageUrl)
      await checkAndGenerateMilestoneActivity()

      setShowSuccess(true)
      setTimeout(() => {
        setName("")
        setGameType("PES")
        setDate(new Date().toISOString().split("T")[0])
        setPlacements([
          { position: 1, playerId: "" },
          { position: 2, playerId: "" },
          { position: 3, playerId: "" },
        ])
        setImageBase64(null) // Reset image
        setShowSuccess(false)
      }, 1500)
    }
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (players.length < 1) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="ثبت تورنمنت" />
        <div className="px-4 py-12 text-center">
          <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-lg font-semibold text-foreground mb-2">بازیکنی وجود ندارد</h2>
          <p className="text-muted-foreground mb-6">ابتدا بازیکنان را اضافه کنید</p>
          <Button onClick={() => router.push("/players")}>افزودن بازیکن</Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="ثبت تورنمنت" subtitle="ثبت نتایج مسابقات تورنمنت" />

      {showSuccess ? (
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">ثبت شد!</h2>
          <p className="text-muted-foreground">تورنمنت با موفقیت ذخیره شد</p>
        </div>
      ) : (
        <form onSubmit={submitTournament} className="px-4 py-6 space-y-6">
          {/* Tournament Info */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-accent" />
              <span className="font-medium text-foreground">اطلاعات تورنمنت</span>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">نام تورنمنت</label>
              <Input
                placeholder="مثلا: جام زمستانی ۱۴۰۳"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-0 h-12 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">نوع بازی</label>
                <Select value={gameType} onValueChange={setGameType}>
                  <SelectTrigger className="bg-secondary border-0 h-12 rounded-xl">
                    <SelectValue placeholder="انتخاب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gameTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">تاریخ</label>
                <ShamsiDatePicker value={date} onChange={setDate} />
              </div>
            </div>

            <ImageUpload value={imageBase64} onChange={setImageBase64} />
          </div>

          {/* Placements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">نتایج</span>
              <Button type="button" variant="ghost" size="sm" onClick={addPlacement} className="text-primary">
                <Plus className="h-4 w-4 ml-1" />
                افزودن رتبه
              </Button>
            </div>

            {placements.map((placement) => (
              <div
                key={placement.position}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    placement.position === 1 && "bg-gold/20",
                    placement.position === 2 && "bg-silver/20",
                    placement.position === 3 && "bg-bronze/20",
                    placement.position > 3 && "bg-secondary",
                  )}
                >
                  {placement.position === 1 ? (
                    <Medal className="h-5 w-5 text-gold" />
                  ) : placement.position === 2 ? (
                    <Award className="h-5 w-5 text-silver" />
                  ) : placement.position === 3 ? (
                    <Award className="h-5 w-5 text-bronze" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">#{placement.position}</span>
                  )}
                </div>

                <Select value={placement.playerId} onValueChange={(v) => updatePlacement(placement.position, v)}>
                  <SelectTrigger className="flex-1 bg-secondary border-0 h-12 rounded-xl">
                    <SelectValue placeholder="انتخاب بازیکن..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((p) => !selectedPlayerIds.includes(p.id) || p.id === placement.playerId)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {placements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlacement(placement.position)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!name.trim() || !placements[0]?.playerId || isSubmitting}
            className="w-full h-14 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "ثبت تورنمنت"}
          </Button>
        </form>
      )}

      <BottomNav />
    </div>
  )
}
