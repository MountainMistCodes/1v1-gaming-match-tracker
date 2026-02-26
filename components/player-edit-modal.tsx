"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AvatarUpload } from "@/components/avatar-upload"
import { X, Loader2, Check } from "lucide-react"
import type { Player } from "@/lib/types"
import { revalidateLeaderboardCache } from "@/lib/revalidate-leaderboard"

interface PlayerEditModalProps {
  player: Player
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPlayer: Player) => void
}

export function PlayerEditModal({ player, isOpen, onClose, onSave }: PlayerEditModalProps) {
  const [name, setName] = useState(player.name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(player.avatar_url || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  async function handleSave() {
    if (!name.trim()) {
      setError("نام بازیکن الزامی است")
      return
    }

    setIsLoading(true)
    setError("")

    const supabase = createClient()
    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        name: name.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq("id", player.id)
      .select()
      .single()

    setIsLoading(false)

    if (updateError) {
      setError("خطا در بروزرسانی بازیکن")
      return
    }

    await revalidateLeaderboardCache()
    onSave(data as Player)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">ویرایش بازیکن</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Avatar Upload */}
        <div className="flex justify-center">
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} size="md" />
        </div>

        {/* Name Input */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">نام بازیکن</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام بازیکن"
            className="bg-secondary border-border"
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isLoading}>
            انصراف
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            ذخیره
          </Button>
        </div>
      </div>
    </div>
  )
}
