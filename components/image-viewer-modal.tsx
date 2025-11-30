"use client"

import { X, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageViewerModalProps {
  imageUrl: string
  title?: string
  onClose: () => void
}

export function ImageViewerModal({ imageUrl, title, onClose }: ImageViewerModalProps) {
  function handleDownload() {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `blacklist-${Date.now()}.jpg`
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title || "تصویر"}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Image */}
        <div className="relative aspect-video bg-secondary">
          <img src={imageUrl || "/placeholder.svg"} alt={title || "تصویر"} className="w-full h-full object-contain" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4">
          <Button variant="outline" className="flex-1 rounded-xl bg-transparent" onClick={handleDownload}>
            <Download className="h-4 w-4 ml-2" />
            دانلود
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl bg-transparent"
            onClick={() => window.open(imageUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4 ml-2" />
            باز کردن
          </Button>
        </div>
      </div>
    </div>
  )
}
