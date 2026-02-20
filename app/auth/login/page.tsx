"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

type LoginResponse = {
  ok?: boolean
  error?: string
}

export default function LoginPage() {
  const isAuthDisabled = process.env.NEXT_PUBLIC_DEVELOPMENT === "DEVELOPMENT"
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [website, setWebsite] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (isAuthDisabled) {
      window.location.replace("/")
    }
  }, [isAuthDisabled])

  const getErrorMessage = (status: number, fallback?: string) => {
    if (status === 401) return "Invalid email or access denied."
    if (status === 429) return "Too many attempts. Please try again later."
    if (status >= 500) return "Server error. Please try again."
    return fallback || "Login failed. Please try again."
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, website }),
        signal: controller.signal,
      })

      let result: LoginResponse = {}
      try {
        result = (await response.json()) as LoginResponse
      } catch {
        result = {}
      }

      if (!response.ok || !result.ok) {
        throw new Error(getErrorMessage(response.status, result.error))
      }

      window.location.replace("/")
    } catch (err: any) {
      const message =
        err?.name === "AbortError"
          ? "Request timed out. Please try again."
          : err?.message || "An unexpected error occurred."

      setError(message)
      toast({
        variant: "destructive",
        title: "Login failed",
        description: message,
      })
    } finally {
      clearTimeout(timeout)
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
              <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
              <CardDescription>Enter your allowed email to continue</CardDescription>
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
                    Email
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
                  {isLoading ? "Checking..." : "Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
