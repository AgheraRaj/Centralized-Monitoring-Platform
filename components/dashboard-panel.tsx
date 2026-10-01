import type { ReactNode } from "react"

type DashboardPanelProps = {
  title: string
  description?: string
  children: ReactNode
}

export function DashboardPanel({ title, description, children }: DashboardPanelProps) {
  return (
    <section className="rounded-xl bg-muted/50 p-5">
      <div className="mb-4">
        <h2 className="text-base font-medium">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}