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
import { UptimeChart } from "@/components/uptime/uptime-chart"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { getDailyUptime, getStationUptime } from "@/lib/queries/uptime"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type UptimePageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

function uptimePercent(upHours: number, openHours: number) {
  return openHours > 0 ? (upHours / openHours) * 100 : null
}

function describeDataUsed(row: {
  hasCompressorSignal: boolean
  hasFlowSignal: boolean
}) {
  const sources = ["Fills"]
  if (row.hasCompressorSignal) sources.push("compressor")
  if (row.hasFlowSignal) sources.push("gas flow")
  return sources.join(" + ")
}

export default async function UptimePage({ searchParams }: UptimePageProps) {
  await requireSession()

  const filters = await getDashboardFilters(await searchParams)
  if (!filters) {
    return (
      <DashboardPanel title="No fill data found">
        <p className="text-sm text-muted-foreground">
          Run db/002_dispenser_fills.sql and db/003_station_hours.sql in pgAdmin,
          then run npm run db:refresh.
        </p>
      </DashboardPanel>
    )
  }

  const { station, range } = filters
  const [dailyUptime, stationUptime] = await Promise.all([
    getDailyUptime({ station, range }),
    getStationUptime({ station, range }),
  ])

  const upHours = stationUptime.reduce((sum, row) => sum + row.upHours, 0)
  const openHours = stationUptime.reduce((sum, row) => sum + row.openHours, 0)
  const closedDays = stationUptime.reduce((sum, row) => sum + row.closedDays, 0)
  const overallUptime = uptimePercent(upHours, openHours)

  const chartData = dailyUptime.map((day) => {
    const percent = uptimePercent(day.upHours, day.openHours)
    return {
      day: day.day,
      uptimePercent: percent === null ? null : Number(percent.toFixed(1)),
    }
  })

  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Station uptime</h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
          <p className="text-sm text-muted-foreground">
            An hour is up when the station has a fill, a compressor running-hour
            increase, or gas flow. Days with no activity at all are treated as
            closed and left out.
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Uptime"
          value={overallUptime === null ? "--" : formatPercent(overallUptime)}
          hint="Up hours / open hours"
        />
        <KpiCard label="Hours up" value={formatInteger(upHours)} />
        <KpiCard label="Hours down" value={formatInteger(openHours - upHours)} />
        <KpiCard
          label="Closed days"
          value={formatInteger(closedDays)}
          hint="Station-days with no activity, left out"
        />
      </div>

      <DashboardPanel title="Uptime per day">
        <UptimeChart data={chartData} />
      </DashboardPanel>

      <DashboardPanel title="By station">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead className="text-right">Uptime</TableHead>
              <TableHead className="text-right">Hours up</TableHead>
              <TableHead className="text-right">Hours down</TableHead>
              <TableHead className="text-right">Closed days</TableHead>
              <TableHead>Data used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stationUptime.map((row) => {
              const percent = uptimePercent(row.upHours, row.openHours)
              return (
                <TableRow key={row.station}>
                  <TableCell className="font-medium">
                    {getStationName(row.station)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {percent === null ? "--" : formatPercent(percent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.upHours)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.openHours - row.upHours)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.closedDays)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {describeDataUsed(row)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </DashboardPanel>
    </div>
  )
}