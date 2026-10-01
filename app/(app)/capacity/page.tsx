import { UtilizationChart } from "@/components/capacity/utilization-chart"
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
import { getDashboardFilters } from "@/lib/dashboard-filters"
import {
  getCapacityKgPerHour,
  getRatedCapacityKgPerDay,
} from "@/lib/dispenser-capacity"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { getDispenserSummary } from "@/lib/queries/dispensers"
import { getDailyVehicles } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type CapacityPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

function utilizationPercent(soldKg: number, ratedKg: number) {
  return ratedKg > 0 ? (soldKg / ratedKg) * 100 : null
}

export default async function CapacityPage({ searchParams }: CapacityPageProps) {
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
  const [summary, dailyVehicles] = await Promise.all([
    getDispenserSummary({ station, range }),
    getDailyVehicles({ station, range }),
  ])

  const stationRows = summary.map((row) => {
    const ratedKgPerDay = getRatedCapacityKgPerDay(row.station, row.dispensers)
    const averageDailyKg = row.activeDays > 0 ? row.kg / row.activeDays : 0
    return {
      ...row,
      capacityKgPerHour: getCapacityKgPerHour(row.station),
      ratedKgPerDay,
      averageDailyKg,
      utilization: utilizationPercent(averageDailyKg, ratedKgPerDay),
    }
  })

  const totalDispensers = stationRows.reduce((sum, row) => sum + row.dispensers, 0)
  const totalRatedKgPerDay = stationRows.reduce((sum, row) => sum + row.ratedKgPerDay, 0)

  // Average over days that had fills, so closed days do not drag the average down.
  const activeDays = dailyVehicles.filter((day) => day.vehicles > 0)
  const averageDailyKg =
    activeDays.length > 0
      ? activeDays.reduce((sum, day) => sum + day.kg, 0) / activeDays.length
      : 0
  const overallUtilization = utilizationPercent(averageDailyKg, totalRatedKgPerDay)

  const chartData = dailyVehicles.map((day) => {
    const percent =
      day.vehicles > 0 ? utilizationPercent(day.kg, totalRatedKgPerDay) : null
    return {
      day: day.day,
      utilizationPercent: percent === null ? null : Number(percent.toFixed(1)),
    }
  })

  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dispenser capacity &amp; utilization
          </h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
          <p className="text-sm text-muted-foreground">
            Rated capacity = dispensers × kg per hour × 24 hours. Utilization is
            the average daily gas sold divided by that capacity. Only days with
            fills are averaged.
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Dispensers"
          value={formatInteger(totalDispensers)}
          hint="With at least one fill in this period"
        />
        <KpiCard
          label="Rated capacity per day (kg)"
          value={formatInteger(totalRatedKgPerDay)}
        />
        <KpiCard
          label="Average daily sales (kg)"
          value={formatInteger(averageDailyKg)}
        />
        <KpiCard
          label="Utilization"
          value={overallUtilization === null ? "--" : formatPercent(overallUtilization)}
        />
      </div>

      <DashboardPanel title="Utilization per day">
        <UtilizationChart data={chartData} />
      </DashboardPanel>

      <DashboardPanel title="By station">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead className="text-right">Dispensers</TableHead>
              <TableHead className="text-right">Rated kg/hr each</TableHead>
              <TableHead className="text-right">Rated kg/day</TableHead>
              <TableHead className="text-right">Avg daily sales (kg)</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stationRows.map((row) => (
              <TableRow key={row.station}>
                <TableCell className="font-medium">
                  {getStationName(row.station)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.dispensers)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.capacityKgPerHour)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.ratedKgPerDay)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.averageDailyKg)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.utilization === null ? "--" : formatPercent(row.utilization)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
    </div>
  )
}