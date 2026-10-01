import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

// Call this at the top of every protected page, route handler and data function.
// proxy.ts only checks that a session cookie exists; this checks it is valid.
export async function requireSession() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  return session
}