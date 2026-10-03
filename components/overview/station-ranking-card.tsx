import { DashboardPanel } from "@/components/dashboard-panel"
import { StatusBadge } from "@/components/overview/status-badge"
import { formatInteger, formatPercent } from "@/lib/format"

export type RankingRow = {
  label: string
  value: number
  detail: string
  // Optional uptime, shown as a small badge.
  uptime?: number | null
}

type StationRankingCardProps = {
  title: string
  description: string
  valueLabel: string
  rows: RankingRow[]
  href?: string
  linkLabel?: string
}

export function StationRankingCard({
  title,
  description,
  valueLabel,
  rows,
  href,
  linkLabel,
}: StationRankingCardProps) {
  const largest = Math.max(...rows.map((row) => row.value), 1)

  return (
    <DashboardPanel title={title} description={description} href={href} linkLabel={linkLabel}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fills in this period.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">
                  <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}</span>
                  {row.label}
                </p>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatInteger(row.value)}{" "}
                  <span className="font-normal text-muted-foreground">{valueLabel}</span>
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.value / largest) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{row.detail}</p>
                {row.uptime !== undefined && row.uptime !== null && (
                  <StatusBadge tone={row.uptime >= 90 ? "good" : "warning"}>
                    Uptime {formatPercent(row.uptime)}
                  </StatusBadge>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardPanel>
  )
}