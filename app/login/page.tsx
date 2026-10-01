import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { getSession } from "@/lib/session"

export default async function LoginPage() {
  // Real session check here (not in proxy.ts) so a stale cookie cannot cause a redirect loop.
  const session = await getSession()
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="relative grid min-h-svh place-items-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm />
    </main>
  )
}