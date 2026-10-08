import { ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { ChartDownloadButton } from "@/components/chart-download-button"
import { ChartExportProvider } from "@/components/export/chart-export-provider"

type DashboardPanelProps = {
  title: string
  description?: string
  // Optional link to the detail page, shown at the top right.
  href?: string
  linkLabel?: string
  // Optional controls (for example a switch) shown at the top right, before the link.
  action?: ReactNode
  // "end" pushes the content to the bottom of the card. When a taller card sits
  // beside this one in the grid, the spare height becomes space between the
  // title and the content. The content keeps its own size.
  contentAlign?: "start" | "end"
  children: ReactNode
}

export function DashboardPanel({
  title,
  description,
  href,
  linkLabel = "View all",
  action,
  contentAlign = "start",
  children,
}: DashboardPanelProps) {
  const alignToEnd = contentAlign === "end"

  return (
    <ChartExportProvider>
      <section className={`h-full rounded-xl bg-muted/50 p-5 ${alignToEnd ? "flex flex-col" : ""}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {action}
            {href && (
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {linkLabel}
                <ChevronRight className="size-4" />
              </Link>
            )}
            <ChartDownloadButton title={title} description={description} />
          </div>
        </div>
        {alignToEnd ? <div className="mt-auto">{children}</div> : children}
      </section>
    </ChartExportProvider>
  )
}
