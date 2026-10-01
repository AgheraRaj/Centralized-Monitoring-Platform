"use client"

import { ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"

import { StationSelector } from "@/components/station-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { isActiveNavigationItem, NAVIGATION_ITEMS } from "@/lib/navigation"

export function AppHeader() {
  const pathname = usePathname()
  const pageTitle = NAVIGATION_ITEMS.find((item) =>
    isActiveNavigationItem(pathname, item)
  )?.title

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4 mt-5 mr-2" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground sm:inline">CMP</span>
        <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
        <span className="truncate font-medium">{pageTitle}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <StationSelector />
        <ThemeToggle />
      </div>
    </header>
  )
}