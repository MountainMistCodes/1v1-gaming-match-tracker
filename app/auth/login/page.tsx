"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { AlertCircle, CheckCircle, Mail, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

const TRUSTED_EMAILS = [
  "mahdi.loravand2002@gmail.com",
  "matinkiaee.sy81@gmail.com",
  // ADD TRUSTED EMAILS HERE
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isPolling) {
        console.log("[v0] Session detected via onAuthStateChange")
        toast({
          title: "ورود موفق",
          description: "با موفقیت وارد شدید.",
        })
        setIsPolling(false)
        router.push("/")
      }
    })

    if (!isSent || !isPolling) return

    let pollInterval: NodeJS.Timeout

    const checkAuthStatus = async () => {
      console.log("[v0] Polling for session status...")
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        console.log("[v0] Session detected from another device!")
        toast({
          title: "ورود موفق",
          description: "با موفقیت وارد شدید.",
        })
        setIsPolling(false)
        router.push("/")
      }
    }

    // Poll every 2 seconds
    pollInterval = setInterval(checkAuthStatus, 2000)

    // Stop polling after 5 minutes
    const timeout = setTimeout(
      () => {
        setIsPolling(false)
        clearInterval(pollInterval)
      },
      5 * 60 * 1000,
    )

    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [isSent, isPolling, router, toast])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true) // Move loading state to the start to prevent "stuck" feeling
    setError(null)

    const normalizedEmail = email.toLowerCase().trim()

    if (!TRUSTED_EMAILS.includes(normalizedEmail)) {
      setTimeout(() => {
        setIsLoading(false)
        setError(
          "ایمیل شما در لیست مجاز نیست. این وب‌سایت فقط برای کاربران مجاز قابل دسترسی است. لطفاً با توسعه‌دهندگان تماس بگیرید.",
        )
        toast({
          variant: "destructive",
          title: "دسترسی غیرمجاز",
          description: "ایمیل شما در لیست مجاز نیست.",
        })
      }, 500) // Small delay for better UX
      return
    }

    const supabase = createClient()

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const redirectTo = `${origin}/auth/callback`

      console.log("[v0] Attempting magic link with redirect:", redirectTo)

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (error) throw error
      setIsSent(true)
      setIsPolling(true)
      toast({
        title: "لینک ورود ارسال شد",
        description: "لطفاً صندوق ورودی ایمیل خود را بررسی کنید.",
      })
    } catch (error: any) {
      console.error("[v0] Magic link error:", error)
      setError(error.message || "خطایی در ارسال لینک ورود رخ داد")
      toast({
        variant: "destructive",
        title: "خطا",
        description: error.message || "خطایی در ارسال لینک ورود رخ داد",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 -z-10" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <Image src="/logo.png" alt="Black List Logo" width={80} height={80} className="rounded-2xl shadow-lg" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">ورود به بلک لیست</CardTitle>
              <CardDescription>برای دریافت لینک ورود، ایمیل معتبر خود را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent>
              {isSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-success/20 p-3">
                      {isPolling ? (
                        <RefreshCw className="w-8 h-8 text-success animate-spin" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-success" />
                      )}
                    </div>
                  </div>
                  <Alert className="bg-success/10 border-success/20 text-right">
                    <Mail className="h-4 w-4 ml-2" />
                    <AlertDescription className="text-success-foreground">
                      لینک ورود به ایمیل <span className="font-bold">{email}</span> ارسال شد. لطفاً صندوق ورودی خود را
                      بررسی کنید.
                    </AlertDescription>
                  </Alert>
                  {isPolling && (
                    <Alert className="bg-primary/10 border-primary/20 text-right">
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      <AlertDescription className="text-sm">
                        در حال انتظار برای ورود... می‌توانید لینک را در دستگاه دیگری باز کنید و این صفحه به طور خودکار
                        شما را وارد می‌کند.
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-muted-foreground">
                    اگر ایمیل را دریافت نکردید، پوشه هرزنامه را بررسی کنید.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSent(false)
                      setEmail("")
                      setIsPolling(false)
                    }}
                    className="w-full rounded-xl"
                  >
                    تلاش مجدد با ایمیل دیگر
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="text-right">
                      <AlertCircle className="h-4 w-4 ml-2" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm font-medium pr-1">
                      ایمیل
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError(null)
                      }}
                      className="text-left rounded-xl bg-background/50"
                      dir="ltr"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                    disabled={isLoading || !email.trim()}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        در حال ارسال...
                      </span>
                    ) : (
                      "ارسال لینک ورود"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
