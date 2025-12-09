"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Share } from "lucide-react"
import Image from "next/image"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isPWAInstalled(): boolean {
  // Guard against SSR
  if (typeof window === "undefined") return false

  // Check display-mode: standalone (works on most browsers)
  if (window.matchMedia("(display-mode: standalone)").matches) return true

  // Check iOS Safari standalone mode
  if ((navigator as any).standalone === true) return true

  // Check if running in TWA (Trusted Web Activity) on Android
  if (document.referrer.includes("android-app://")) return true

  // Check localStorage flag (set when user installs)
  if (localStorage.getItem("pwa-installed") === "true") return true

  return false
}

const DISMISS_COUNT_KEY = "pwa-install-dismissed-count"
const LAST_DISMISS_KEY = "pwa-install-dismissed-last"

const getCooldownDays = (dismissCount: number): number => {
  switch (dismissCount) {
    case 1:
      return 3
    case 2:
      return 7
    case 3:
      return 30
    default:
      return 90
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(true) // Default true to hide during SSR

  useEffect(() => {
    const installed = isPWAInstalled()
    setIsInstalled(installed)

    if (installed) {
      return // Already installed, don't show prompt
    }

    // Check if dismissed recently
    const dismissCount = Number.parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0")
    const lastDismissedTime = Number.parseInt(localStorage.getItem(LAST_DISMISS_KEY) || "0")

    if (dismissCount > 0) {
      const cooldownDays = getCooldownDays(dismissCount)
      const cooldownMillis = cooldownDays * 24 * 60 * 60 * 1000
      if (Date.now() - lastDismissedTime < cooldownMillis) {
        return
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    if (isIOSDevice) {
       // For iOS, we don't have the install prompt event, so we just show the banner.
       // We'll respect the same dismissal logic.
      setTimeout(() => setShowPrompt(true), 2000)
      return
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowPrompt(true), 2000)
    }

    const installedHandler = () => {
      localStorage.setItem("pwa-installed", "true")
      // Clear dismissal flags on install
      localStorage.removeItem(DISMISS_COUNT_KEY)
      localStorage.removeItem(LAST_DISMISS_KEY)
      setShowPrompt(false)
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", installedHandler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true")
      localStorage.removeItem(DISMISS_COUNT_KEY)
      localStorage.removeItem(LAST_DISMISS_KEY)
      setShowPrompt(false)
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    const currentDismissCount = Number.parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0")
    const newDismissCount = currentDismissCount + 1
    localStorage.setItem(DISMISS_COUNT_KEY, newDismissCount.toString())
    localStorage.setItem(LAST_DISMISS_KEY, Date.now().toString())
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/logo.png" alt="بلک لیست" width={48} height={48} className="object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">نصب بلک لیست</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? "برای دسترسی سریع‌تر، اپلیکیشن را به صفحه اصلی اضافه کنید"
                : "اپلیکیشن را نصب کنید تا همیشه در دسترس باشد"}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Share className="h-4 w-4 text-primary" />
              <span>
                روی دکمه <strong className="text-foreground">Share</strong> بزنید، سپس{" "}
                <strong className="text-foreground">Add to Home Screen</strong> را انتخاب کنید
              </span>
            </p>
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full mt-4 h-11 rounded-xl bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 ml-2" />
            نصب اپلیکیشن
          </Button>
        )}
      </div>
    </div>
  )
}
