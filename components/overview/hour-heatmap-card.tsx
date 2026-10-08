import { DashboardPanel } from "@/components/dashboard-panel"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatInteger } from "@/lib/format"
import { ChartExportData } from "@/components/export/chart-export-provider"
import { hourHeatmapTable } from "@/lib/export/chart-table"

type HourHeatmapCardProps = {
  // One row per station (or dispenser) with 24 hourly vehicle counts.
  rows: { label: string; values: number[] }[]
  // Optional link to another page, shown at the top right.
  href?: string
  linkLabel?: string
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

// Empty cells stay faint; busy cells get close to the full colour.
function cellColor(value: number, largest: number) {
  if (value === 0) return undefined
  const strength = 12 + 88 * (value / largest)
  return `color-mix(in oklab, ${CHART_COLORS.primary} ${strength}%, transparent)`
}

export function HourHeatmapCard({ rows, href, linkLabel }: HourHeatmapCardProps) {
  const largest = Math.max(...rows.flatMap((row) => row.values), 1)

  return (
    <DashboardPanel
      title="Vehicles by hour of day"
      description="Total vehicles in each clock hour across the period. Hover a cell for the exact count."
      href={href}
      linkLabel={linkLabel}
      contentAlign="end"
    >
      <ChartExportData table={hourHeatmapTable(rows)} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fills in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <div data-export-target className="min-w-[640px]" role="img" aria-label="Heatmap of vehicles by hour of day">
            <div className="grid grid-cols-[7rem_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-muted-foreground">
              <span />
              {HOURS.map((hour) => (
                <span key={hour} className="text-center tabular-nums">
                  {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
            {rows.map((row) => (
              <div
                key={row.label}
                className="mt-1 grid grid-cols-[7rem_repeat(24,minmax(0,1fr))] items-center gap-1"
              >
                <span className="truncate pr-2 text-xs">{row.label}</span>
                {HOURS.map((hour) => (
                  <span
                    key={hour}
                    title={`${row.label}, ${String(hour).padStart(2, "0")}:00: ${formatInteger(row.values[hour])} vehicles`}
                    className="h-6 rounded-sm bg-foreground/5"
                    style={{ backgroundColor: cellColor(row.values[hour], largest) }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            Low
            {[0, 25, 50, 75, 100].map((strength) => (
              <span
                key={strength}
                className="h-3 w-5 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in oklab, ${CHART_COLORS.primary} ${12 + strength * 0.88}%, transparent)`,
                }}
              />
            ))}
            High
          </div>
        </div>
      )}
    </DashboardPanel>
  )
}
