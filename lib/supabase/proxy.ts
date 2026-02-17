import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, isTrustedEmail } from "@/lib/auth/config"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith("/auth")
  const isLoginApi = pathname === "/api/auth/login"
  const isPwaRuntime = pathname === "/sw.js" || pathname === "/manifest.webmanifest" || pathname.startsWith("/workbox-")
  const isPublicAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(pathname)
  const authEmail = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? ""
  const isAuthenticated = isTrustedEmail(authEmail)

  if (isLoginApi || isPwaRuntime) {
    return NextResponse.next()
  }

  if (!isAuthenticated && authEmail) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    response.cookies.delete(AUTH_COOKIE_NAME)
    return response
  }

  // Redirect unauthorized users to login
  if (!isAuthenticated && !isAuthPage && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect logged in users away from login page
  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}