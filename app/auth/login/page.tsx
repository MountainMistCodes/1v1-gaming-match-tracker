"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [website, setWebsite] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, website }),
      })

      const result = (await response.json()) as { error?: string; ok?: boolean }
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "ورود انجام نشد")
      }

      toast({
        title: "ورود موفق",
        description: "با موفقیت وارد شدید.",
      })
      router.push("/")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "خطایی در ورود رخ داد")
      toast({
        variant: "destructive",
        title: "خطا",
        description: error.message || "خطایی در ورود رخ داد",
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
              <CardDescription>برای ورود، ایمیل مجاز خود را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
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
                <div className="hidden" aria-hidden>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="text"
                    autoComplete="off"
                    tabIndex={-1}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
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
                      در حال بررسی...
                    </span>
                  ) : (
                    "ورود"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

