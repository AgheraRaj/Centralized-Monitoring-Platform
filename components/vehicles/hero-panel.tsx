import type { ReactNode } from "react"

type HeroPanelProps = {
  label: string
  value: string
  // Usually a <ChangeBadge />.
  change?: ReactNode
  chips?: string[]
  footer: string
  chartTitle: string
  chartDescription: string
  // The chart, shown on the right.
  children: ReactNode
}

// The big "headline number plus trend chart" block at the top of a page.
export function HeroPanel({
  label,
  value,
  change,
  chips = [],
  footer,
  chartTitle,
  chartDescription,
  children,
}: HeroPanelProps) {
  return (
    <section className="grid overflow-hidden rounded-xl bg-muted/50 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 p-5 lg:border-r lg:border-border">
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 text-5xl font-semibold tabular-nums">{value}</p>
          {change && <div className="mt-2">{change}</div>}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-background/60 px-2 py-1 text-xs tabular-nums"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <p className="mt-auto text-xs text-muted-foreground">{footer}</p>
      </div>

      <div className="min-w-0 p-5">
        <h2 className="text-base font-medium">{chartTitle}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{chartDescription}</p>
        {children}
      </div>
    </section>
  )
}