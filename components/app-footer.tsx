// Slim bar at the bottom of the content panel, shown on every dashboard page.
export function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="flex h-10 shrink-0 items-center justify-between gap-2 border-t bg-background px-4 text-xs text-muted-foreground">
      <span className="truncate">&copy; {year} Altrex. All rights reserved.</span>
      <span className="hidden truncate sm:inline">Centralized Monitoring Platform</span>
    </footer>
  )
}