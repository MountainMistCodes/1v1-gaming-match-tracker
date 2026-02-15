export const AUTH_COOKIE_NAME = "app_auth"

const TRUSTED_EMAILS = [
  "mahdi.loravand2002@gmail.com",
  "matinkiaee.sy81@gmail.com",
  // Add other allowed emails here.
]

const TRUSTED_EMAIL_SET = new Set(TRUSTED_EMAILS.map((email) => email.toLowerCase().trim()))

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function isTrustedEmail(email: string): boolean {
  return TRUSTED_EMAIL_SET.has(normalizeEmail(email))
}
