"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Camera, X, Loader2, ImageIcon, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/image-utils"

interface AvatarUploadProps {
  value: string | null
  onChange: (base64: string | null) => void
  className?: string
  size?: "sm" | "md" | "lg"
}

export function AvatarUpload({ value, onChange, className, size = "md" }: AvatarUploadProps) {
  const [isCompressing, setIsCompressing] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [showOptions, setShowOptions] = useState(false)

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      return
    }

    setIsCompressing(true)
    setShowOptions(false)

    try {
      // Compress to smaller size for avatars (200px, higher quality)
      const compressed = await compressImage(file, 200, 0.8)
      onChange(compressed)
    } catch (err) {
      console.error("Compression failed:", err)
    } finally {
      setIsCompressing(false)
    }
  }

  function handleRemove() {
    onChange(null)
    setShowOptions(false)
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

  return (
    <div className={cn("relative", className)}>
      <label className="text-sm text-muted-foreground block mb-2">عکس بازیکن (اختیاری)</label>

      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full overflow-hidden bg-secondary border-2 border-border",
            "flex items-center justify-center relative",
          )}
        >
          {isCompressing ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : value ? (
            <img src={value || "/placeholder.svg"} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {value ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm"
            >
              <X className="h-4 w-4" />
              حذف
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressing}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm",
                  isCompressing && "opacity-50 cursor-not-allowed",
                )}
              >
                <Camera className="h-4 w-4" />
                دوربین
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isCompressing}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm",
                  isCompressing && "opacity-50 cursor-not-allowed",
                )}
              >
                <ImageIcon className="h-4 w-4" />
                گالری
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  )
}
