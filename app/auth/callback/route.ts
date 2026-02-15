import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const otpType = requestUrl.searchParams.get("type")

  // If the request comes from Supabase, the origin might be different.
  // We should redirect back to the domain that initiated the request.
  const origin = requestUrl.origin

  if (code || (tokenHash && otpType)) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      },
    )

    let error: Error | null = null

    if (code) {
      const exchangeResult = await supabase.auth.exchangeCodeForSession(code)
      error = exchangeResult.error
    } else if (tokenHash && otpType) {
      const verifyResult = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as EmailOtpType,
      })
      error = verifyResult.error
    }

    if (error) {
      console.error("[v0] Auth callback error:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log("[v0] Auth callback success, redirecting to home")
  } else {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent("Invalid auth callback link")}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
