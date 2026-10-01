import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

// Fast, cookie-only check. It does not prove the session is valid;
// pages and data functions must still call requireSession().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Protect everything except the login page, auth API, Next.js internals and static files.
  matcher: ["/((?!api/auth|login|_next|favicon.ico|.*\\..*).*)"],
}