import { StatusBadge } from "@/components/overview/status-badge"
import { formatInteger, formatPercent } from "@/lib/format"
import { ChartExportData } from "@/components/export/chart-export-provider"
import { measuresTable } from "@/lib/export/chart-table"

export type RankingRow = {
  label: string
  value: number
  detail: string
  // Optional uptime, shown as a small badge.
  uptime?: number | null
}

type RankingListProps = {
  rows: RankingRow[]
  // Shown after each value, for example "vehicles" or "kg".
  valueLabel: string
  emptyText?: string
}

// The ranked list with bars. Used by the plain ranking card and the one with a switch.
export function RankingList({
  rows,
  valueLabel,
  emptyText = "No fills in this period.",
}: RankingListProps) {
  const largest = Math.max(...rows.map((row) => row.value), 1)

  if (rows.length === 0) {
    return (
      <>
        <ChartExportData table={measuresTable([])} />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </>
    )
  }

  return (
    <>
      <ChartExportData table={measuresTable(rows.map((row) => [
        row.label,
        `${formatInteger(row.value)} ${valueLabel}${row.detail ? ` · ${row.detail}` : ""}${row.uptime == null ? "" : ` · Uptime ${formatPercent(row.uptime)}`}`,
      ]))} />
      <ol data-export-target className="flex flex-col gap-4">
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
    </>
  )
}
