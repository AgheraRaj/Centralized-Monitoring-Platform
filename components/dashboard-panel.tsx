import { ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

type DashboardPanelProps = {
  title: string
  description?: string
  // Optional link to the detail page, shown at the top right.
  href?: string
  linkLabel?: string
  children: ReactNode
}

export function DashboardPanel({
  title,
  description,
  href,
  linkLabel = "View all",
  children,
}: DashboardPanelProps) {
  return (
    <section className="h-full rounded-xl bg-muted/50 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {linkLabel}
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}