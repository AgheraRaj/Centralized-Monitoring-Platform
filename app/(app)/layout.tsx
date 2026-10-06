import type { ReactNode } from "react"

import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/session"

// Dark mode only: makes the sidebar (and the frame around the content panel)
// lighter than the panel, so the gap stays visible. These variables are scoped
// to this layout, so globals.css is not touched.
const DARK_SIDEBAR_SURFACE =
  "dark:[--sidebar:oklch(0.205_0_0)] dark:[--sidebar-accent:oklch(0.269_0_0)] dark:[--sidebar-border:oklch(1_0_0/10%)]"

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Layouts are not re-run on client-side navigation, so every page and data
  // function under (app) must still call requireSession() itself.
  const session = await requireSession()

  return (
    <SidebarProvider className={`${DARK_SIDEBAR_SURFACE} h-svh overflow-hidden`}>
      <AppSidebar userName={session.user.name} userEmail={session.user.email} />
      {/* The page itself never scrolls. Only the content area below the header does,
          so the rounded panel, its header and the footer stay in place. */}
      <SidebarInset className="min-h-0! overflow-hidden">
        <AppHeader />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {children}
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}