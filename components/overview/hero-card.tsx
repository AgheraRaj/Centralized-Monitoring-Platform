import { ChangeBadge } from "@/components/overview/change-badge"
import { VehiclesTrendChart } from "@/components/overview/vehicles-trend-chart"
import { ChartDownloadButton } from "@/components/chart-download-button"
import { ChartExportProvider } from "@/components/export/chart-export-provider"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"

type HeroCardProps = {
  stationLabel: string
  range: { from: string; to: string }
  totalVehicles: number
  vehiclesChange: number | null
  totalKg: number
  fullFillRate: number | null
  averagePerActiveDay: number
  chartData: { day: string; vehicles: number; previousVehicles: number | null }[]
  hasComparison: boolean
}

export function HeroCard({
  stationLabel,
  range,
  totalVehicles,
  vehiclesChange,
  totalKg,
  fullFillRate,
  averagePerActiveDay,
  chartData,
  hasComparison,
}: HeroCardProps) {
  const chips = [
    `${formatInteger(totalKg)} kg dispensed`,
    fullFillRate === null ? "Full-fill rate --" : `${formatPercent(fullFillRate)} full-fill`,
    `${formatInteger(averagePerActiveDay)} per active day`,
  ]

  return (
    <ChartExportProvider>
      <section className="grid overflow-hidden rounded-xl bg-muted/50 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 p-5 lg:border-r lg:border-border">
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Vehicles served
          </p>
          <p className="mt-1 text-5xl font-semibold tabular-nums">
            {formatInteger(totalVehicles)}
          </p>
          <div className="mt-2">
            <ChangeBadge change={vehiclesChange} unit="%" />
          </div>
        </div>

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

        <p className="mt-auto text-xs text-muted-foreground">
          {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <div className="min-w-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-medium">Vehicles per day</h2>
          <ChartDownloadButton title="Vehicles per day" description={hasComparison ? "This period against the period before it" : "No earlier period to compare with"} summary={`Vehicles served: ${formatInteger(totalVehicles)}`} />
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          {hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"}
        </p>
        <VehiclesTrendChart data={chartData} hasComparison={hasComparison} />
      </div>
      </section>
    </ChartExportProvider>
  )
}
