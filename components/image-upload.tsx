"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Camera, X, Loader2, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { compressImage, formatFileSize } from "@/lib/image-utils"

interface ImageUploadProps {
  value: string | null
  onChange: (base64: string | null) => void
  className?: string
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [isCompressing, setIsCompressing] = useState(false)
  const [originalSize, setOriginalSize] = useState<number | null>(null)
  const [compressedSize, setCompressedSize] = useState<number | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      return
    }

    setIsCompressing(true)
    setOriginalSize(file.size)

    try {
      const compressed = await compressImage(file, 800, 0.7)
      const compressedBinarySize = Math.round((compressed.length * 3) / 4)
      setCompressedSize(compressedBinarySize)
      onChange(compressed)
    } catch (err) {
      console.error("Compression failed:", err)
    } finally {
      setIsCompressing(false)
    }
  }

  function handleRemove() {
    onChange(null)
    setOriginalSize(null)
    setCompressedSize(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm text-muted-foreground block">تصویر (اختیاری)</label>

      {value ? (
        <div className="relative">
          <div className="relative rounded-xl overflow-hidden bg-secondary aspect-video">
            <img src={value || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 left-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
          {originalSize && compressedSize && (
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
              <span className="text-success mr-1">({Math.round((1 - compressedSize / originalSize) * 100)}% کاهش)</span>
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isCompressing}
            className={cn(
              "flex-1 h-20 rounded-xl border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-1",
              "bg-secondary/50 hover:bg-secondary transition-colors",
              "text-muted-foreground hover:text-foreground",
              isCompressing && "opacity-50 cursor-not-allowed",
            )}
          >
            {isCompressing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-xs">دوربین</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isCompressing}
            className={cn(
              "flex-1 h-20 rounded-xl border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-1",
              "bg-secondary/50 hover:bg-secondary transition-colors",
              "text-muted-foreground hover:text-foreground",
              isCompressing && "opacity-50 cursor-not-allowed",
            )}
          >
            {isCompressing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">گالری</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Camera input - captures from camera directly */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Gallery input - opens photo gallery */}
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  )
}
