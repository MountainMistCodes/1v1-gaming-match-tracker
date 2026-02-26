import type React from "react"
import type { Metadata, Viewport } from "next"
import { Vazirmatn } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { Toaster } from "@/components/ui/toaster"
import { LoadingScreen } from "@/components/loading-screen" // added loading screen component
import "./globals.css"

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
})

export const metadata: Metadata = {
  title: "بلک لیست | ثبت نتایج مسابقات",
  description: "ثبت نتایج مسابقات گیمینگ ۱ در مقابل ۱",
  generator: "v0.app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "بلک لیست",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <body className={`${vazirmatn.className} font-sans antialiased min-h-screen`}>
        <LoadingScreen /> {/* Added loading screen at the root */}
        {children}
        <PWAInstallPrompt />
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
