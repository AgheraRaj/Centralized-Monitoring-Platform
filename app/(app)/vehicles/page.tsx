import { DailyVehiclesChart } from "@/components/vehicles/daily-vehicles-chart"
import { DashboardPanel } from "@/components/dashboard-panel"
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
import { resolveDateRange, resolveRangePreset } from "@/lib/date-range"
import { formatDate, formatInteger } from "@/lib/format"
import {
  getDailyVehicles,
  getFillDateBounds,
  getStationSummary,
} from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import {
  ALL_STATIONS,
  getStationName,
  resolveStationFilter,
} from "@/lib/stations"

type VehiclesPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  await requireSession()

  const params = await searchParams
  const station = resolveStationFilter(params.station)
  const rangePreset = resolveRangePreset(params.range)

  const bounds = await getFillDateBounds()
  if (!bounds) {
    return (
      <DashboardPanel title="No fill data found">
        <p className="text-sm text-muted-foreground">
          Run db/002_dispenser_fills.sql in pgAdmin, then run npm run db:refresh.
        </p>
      </DashboardPanel>
    )
  }

  const range = resolveDateRange(rangePreset, bounds)
  const [dailyVehicles, stationSummary] = await Promise.all([
    getDailyVehicles({ station, range }),
    station === ALL_STATIONS ? getStationSummary(range) : Promise.resolve([]),
  ])

  const totalVehicles = dailyVehicles.reduce((sum, day) => sum + day.vehicles, 0)
  const totalKg = dailyVehicles.reduce((sum, day) => sum + day.kg, 0)
  const activeDays = dailyVehicles.filter((day) => day.vehicles > 0).length
  const averagePerActiveDay = activeDays > 0 ? totalVehicles / activeDays : 0
  const busiestDay = dailyVehicles.reduce(
    (busiest, day) => (day.vehicles > busiest.vehicles ? day : busiest),
    dailyVehicles[0]
  )

  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daily vehicles served
          </h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vehicles served" value={formatInteger(totalVehicles)} />
        <KpiCard
          label="Average per day"
          value={formatInteger(averagePerActiveDay)}
          hint={`Across ${activeDays} days with fills`}
        />
        <KpiCard label="Gas dispensed (kg)" value={formatInteger(totalKg)} />
        <KpiCard
          label="Busiest day"
          value={formatInteger(busiestDay?.vehicles ?? 0)}
          hint={busiestDay ? formatDate(busiestDay.day) : undefined}
        />
      </div>

      <DashboardPanel title="Vehicles per day">
        <DailyVehiclesChart data={dailyVehicles} />
      </DashboardPanel>

      {station === ALL_STATIONS && (
        <DashboardPanel title="By station">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Vehicles</TableHead>
                <TableHead className="text-right">Avg / active day</TableHead>
                <TableHead className="text-right">Gas (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stationSummary.map((row) => (
                <TableRow key={row.station}>
                  <TableCell className="font-medium">
                    {getStationName(row.station)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.vehicles)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.activeDays > 0 ? row.vehicles / row.activeDays : 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.kg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardPanel>
      )}
    </div>
  )
}