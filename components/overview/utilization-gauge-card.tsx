import { DashboardPanel } from "@/components/dashboard-panel"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { ChartExportData } from "@/components/export/chart-export-provider"
import { measuresTable } from "@/lib/export/chart-table"

type UtilizationGaugeCardProps = {
  // Percent of rated capacity, or null when it cannot be worked out.
  utilization: number | null
  ratedKgPerDay: number
  averageDailyKg: number
  dispensers: number
  peakDay: { day: string; kg: number } | null
  href: string
}

// A half circle drawn with SVG. `pathLength` makes the dash maths simple: 0 to 100.
const GAUGE_PATH = "M 20 100 A 80 80 0 0 1 180 100"
const AMBER_FROM_PERCENT = 85

export function UtilizationGaugeCard({
  utilization,
  ratedKgPerDay,
  averageDailyKg,
  dispensers,
  peakDay,
  href,
}: UtilizationGaugeCardProps) {
  const filledPercent = Math.min(Math.max(utilization ?? 0, 0), 100)
  const arcColor =
    utilization !== null && utilization >= AMBER_FROM_PERCENT
      ? CHART_COLORS.warning
      : CHART_COLORS.primary

  const rows = [
    ["Rated capacity per day", `${formatInteger(ratedKgPerDay)} kg`],
    ["Average per active day", `${formatInteger(averageDailyKg)} kg`],
    ["Dispensers counted", formatInteger(dispensers)],
    [
      "Peak day",
      peakDay ? `${formatInteger(peakDay.kg)} kg · ${formatDate(peakDay.day)}` : "--",
    ],
  ]

  return (
    <DashboardPanel
      title="Dispenser utilization"
      description="Average daily gas against rated capacity"
      href={href}
      linkLabel="Capacity"
    >
      <ChartExportData table={measuresTable([
        ["Utilization", utilization === null ? "--" : formatPercent(utilization)],
        ...rows.map(([label, value]) => [label, value] as [string, string]),
      ])} />
      <div className="relative mx-auto w-full max-w-60">
        <svg data-export-target viewBox="0 0 200 120" className="w-full" role="img" aria-label="Utilization gauge">
          <path
            d={GAUGE_PATH}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={14}
            strokeLinecap="round"
            pathLength={100}
          />
          <path
            d={GAUGE_PATH}
            fill="none"
            stroke={arcColor}
            strokeWidth={14}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${filledPercent} 100`}
          />
          <text
            x="55"
            y="82"
            fill="currentColor"
            fontSize="30"
            fontWeight="600"
            textAnchor="start"
          >
            {utilization === null ? "--" : formatPercent(utilization)}
          </text>
          <text
            x="50"
            y="105"
            fill="currentColor"
            fontSize="12"
            textAnchor="start"
          >
            of rated capacity
          </text>
        </svg>
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </DashboardPanel>
  )
}
