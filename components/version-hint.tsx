"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const AUTO_HIDE_MS = 1800

type VersionHintProps = {
  version: string
  children: ReactNode
}

export function VersionHint({ version, children }: VersionHintProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const showWithAutoHide = () => {
    clearAutoHide()
    setOpen(true)
    timeoutRef.current = setTimeout(() => setOpen(false), AUTO_HIDE_MS)
  }

  useEffect(() => clearAutoHide, [])

  return (
    <div className="relative w-fit">
      <div
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onTouchStart={showWithAutoHide}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {children}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-full z-30 mt-2 rounded-lg border border-border/80 bg-card/95 px-2.5 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur",
          "transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        )}
      >
        نسخه {version}
      </div>
    </div>
  )
}
