import { DashboardPanel } from "@/components/dashboard-panel"
import { FullFillChart } from "@/components/full-fill/full-fill-chart"
import { VehicleClassChart } from "@/components/full-fill/vehicle-class-chart"
import { KpiCard } from "@/components/kpi-card"
import { RangeSelector } from "@/components/range-selector"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import {
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "@/lib/format"
import {
  describeVehicleClassRanges,
  FULL_FILL_THRESHOLD_BAR,
} from "@/lib/full-fill"
import {
  getDailyFullFill,
  getFullFillBreakdown,
  getFullFillByVehicleClass,
  getUnmeasuredFillCount,
} from "@/lib/queries/full-fill"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type FullFillPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

function rateOf(fullFills: number, fills: number) {
  return fills > 0 ? (fullFills / fills) * 100 : 0
}

export default async function FullFillPage({ searchParams }: FullFillPageProps) {
  await requireSession()

  const filters = await getDashboardFilters(await searchParams)
  if (!filters) {
    return (
      <DashboardPanel title="No fill data found">
        <p className="text-sm text-muted-foreground">
          Run db/002_dispenser_fills.sql in pgAdmin, then run npm run db:refresh.
        </p>
      </DashboardPanel>
    )
  }

  const { station, range } = filters
  const [dailyFullFill, breakdown, vehicleClassFills, unmeasuredFills] =
    await Promise.all([
      getDailyFullFill({ station, range }),
      getFullFillBreakdown({ station, range }),
      getFullFillByVehicleClass({ station, range }),
      getUnmeasuredFillCount({ station, range }),
    ])

  const fullFills = dailyFullFill.reduce((sum, day) => sum + day.fullFills, 0)
  const belowFills = dailyFullFill.reduce((sum, day) => sum + day.belowFills, 0)
  const measuredFills = fullFills + belowFills
  const averageEndPressure =
    measuredFills > 0
      ? breakdown.reduce((sum, row) => sum + row.averageEndPressure * row.fills, 0) /
        measuredFills
      : 0

  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)
  const isByStation = station === ALL_STATIONS

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Full-fill rate</h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
          <p className="text-sm text-muted-foreground">
            A full fill ends at or above {FULL_FILL_THRESHOLD_BAR} bar.
            {unmeasuredFills > 0 &&
              ` ${formatInteger(unmeasuredFills)} fills with no valid end pressure are not included.`}
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Full-fill rate"
          value={measuredFills > 0 ? formatPercent(rateOf(fullFills, measuredFills)) : "--"}
          hint={`Of ${formatInteger(measuredFills)} measured fills`}
        />
        <KpiCard
          label={`At or above ${FULL_FILL_THRESHOLD_BAR} bar`}
          value={formatInteger(fullFills)}
        />
        <KpiCard
          label={`Below ${FULL_FILL_THRESHOLD_BAR} bar`}
          value={formatInteger(belowFills)}
        />
        <KpiCard
          label="Average end pressure (bar)"
          value={measuredFills > 0 ? formatDecimal(averageEndPressure) : "--"}
        />
      </div>

      <DashboardPanel title="Fills per day by end pressure">
        <FullFillChart data={dailyFullFill} />
      </DashboardPanel>

      <DashboardPanel
        title="Fills by vehicle class"
        description={`Estimated from fill size, not recorded by the dispenser. ${describeVehicleClassRanges().join(" · ")}.`}
      >
        <VehicleClassChart data={vehicleClassFills} />
      </DashboardPanel>

      <DashboardPanel title={isByStation ? "By station" : "By dispenser"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isByStation ? "Station" : "Dispenser"}</TableHead>
              <TableHead className="text-right">Fills</TableHead>
              <TableHead className="text-right">Full-fill rate</TableHead>
              <TableHead className="text-right">Avg end pressure (bar)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">
                  {isByStation ? getStationName(row.label) : row.label}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.fills)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(rateOf(row.fullFills, row.fills))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDecimal(row.averageEndPressure)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
    </div>
  )
}