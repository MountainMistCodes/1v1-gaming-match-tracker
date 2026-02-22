import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, IS_AUTH_DISABLED, isTrustedEmail, normalizeEmail } from "@/lib/auth/config"

type AttemptBucket = {
  attempts: number[]
  blockedUntil: number
}

const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const RATE_LIMIT_STORE = new Map<string, AttemptBucket>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown"
  }
  return "unknown"
}

function getRateLimitKey(request: NextRequest, email: string): string {
  return `${getClientIp(request)}:${email}`
}

function isRateLimited(key: string, now: number): boolean {
  const entry = RATE_LIMIT_STORE.get(key)
  if (!entry) return false
  if (entry.blockedUntil > now) return true

  entry.attempts = entry.attempts.filter((ts) => now - ts < WINDOW_MS)
  if (entry.attempts.length === 0) {
    RATE_LIMIT_STORE.delete(key)
    return false
  }
  RATE_LIMIT_STORE.set(key, entry)
  return false
}

function registerAttempt(key: string, now: number) {
  const entry = RATE_LIMIT_STORE.get(key) ?? { attempts: [], blockedUntil: 0 }
  entry.attempts = entry.attempts.filter((ts) => now - ts < WINDOW_MS)
  entry.attempts.push(now)

  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS
    entry.attempts = []
  }

  RATE_LIMIT_STORE.set(key, entry)
}

export async function POST(request: NextRequest) {
  try {
    if (IS_AUTH_DISABLED) {
      return NextResponse.json({ ok: true })
    }

    const body = (await request.json()) as { email?: string; website?: string }
    const email = normalizeEmail(body.email ?? "")
    const honeypot = (body.website ?? "").trim()

    if (!email || honeypot) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 })
    }

    const now = Date.now()
    const key = getRateLimitKey(request, email)

    if (isRateLimited(key, now)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
    }

    registerAttempt(key, now)

    if (!isTrustedEmail(email)) {
      // Keep response generic to avoid leaking allowlisted addresses.
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(AUTH_COOKIE_NAME, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
}
