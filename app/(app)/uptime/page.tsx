import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { StatusBadge } from "@/components/overview/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { RateTrendChart } from "@/components/vehicles/rate-trend-chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import {
  getComparisonRange,
  percentOf,
  pointChange,
  relativeChange,
  sumOf,
} from "@/lib/overview"
import { getDailyUptime, getStationUptime } from "@/lib/queries/uptime"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type UptimePageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

// Same limit the Overview uses to flag a station as "low uptime".
const LOW_UPTIME_PERCENT = 90

type HourCounts = { upHours: number; openHours: number }

function uptimeOf(rows: HourCounts[]) {
  return percentOf(
    sumOf(rows, (row) => row.upHours),
    sumOf(rows, (row) => row.openHours)
  )
}

function roundToOneDecimal(value: number | null) {
  return value === null ? null : Number(value.toFixed(1))
}

// Which signals could be used to tell that a station was up.
function describeDataSources(row: {
  hasCompressorSignal: boolean
  hasFlowSignal: boolean
}) {
  const sources = ["Fills"]
  if (row.hasCompressorSignal) sources.push("Compressor")
  if (row.hasFlowSignal) sources.push("Gas flow")
  return sources
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
  const isAllStations = station === ALL_STATIONS
  const stationLabel = isAllStations ? "All stations" : getStationName(station)

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [dailyUptime, previousDailyUptime, stationUptime] = await Promise.all([
    getDailyUptime({ station, range }),
    previousRange
      ? getDailyUptime({ station, range: previousRange })
      : Promise.resolve(null),
    getStationUptime({ station, range }),
  ])

  // ---- totals and comparison with the previous period
  const upHours = sumOf(stationUptime, (row) => row.upHours)
  const openHours = sumOf(stationUptime, (row) => row.openHours)
  const downHours = openHours - upHours
  const closedDays = sumOf(stationUptime, (row) => row.closedDays)
  const uptime = uptimeOf(stationUptime)

  const previousUptime = previousDailyUptime ? uptimeOf(previousDailyUptime) : null
  const previousDownHours = previousDailyUptime
    ? sumOf(previousDailyUptime, (day) => day.openHours - day.upHours)
    : null

  // ---- highest and lowest: stations when all are selected, otherwise days
  const ranked = (
    isAllStations
      ? stationUptime.map((row) => ({
          name: getStationName(row.station),
          rate: percentOf(row.upHours, row.openHours),
        }))
      : dailyUptime.map((day) => ({
          name: formatDate(day.day),
          rate: percentOf(day.upHours, day.openHours),
        }))
  ).filter((item): item is { name: string; rate: number } => item.rate !== null)

  const best = ranked.reduce<(typeof ranked)[number] | null>(
    (top, item) => (top === null || item.rate > top.rate ? item : top),
    null
  )
  const lowest = ranked.reduce<(typeof ranked)[number] | null>(
    (bottom, item) => (bottom === null || item.rate < bottom.rate ? item : bottom),
    null
  )
  const subject = isAllStations ? "station" : "day"

  const metrics: Metric[] = [
    {
      label: "Hours up",
      value: formatInteger(upHours),
      note: `Of ${formatInteger(openHours)} open hours`,
    },
    {
      label: "Hours down",
      value: formatInteger(downHours),
      change: hasComparison && (
        <ChangeBadge
          change={relativeChange(downHours, previousDownHours)}
          unit="%"
          goodWhen="down"
        />
      ),
    },
    {
      label: "Closed days",
      value: formatInteger(closedDays),
      note: "Station-days with no activity, left out",
    },
    {
      label: `Highest ${subject}`,
      value: best ? formatPercent(best.rate) : "--",
      note: best?.name,
    },
    {
      label: `Lowest ${subject}`,
      value: lowest ? formatPercent(lowest.rate) : "--",
      note: lowest?.name,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Station uptime"
        stationLabel={stationLabel}
        range={range}
        note="An hour is up when the station has a fill, a compressor running-hour increase, or gas flow. Days with no activity at all are treated as closed and left out."
      />

      <HeroPanel
        label="Station uptime"
        value={uptime === null ? "--" : formatPercent(uptime)}
        change={
          hasComparison && (
            <ChangeBadge change={pointChange(uptime, previousUptime)} unit="pp" />
          )
        }
        chips={[
          `${formatInteger(upHours)} hours up`,
          `${formatInteger(downHours)} hours down`,
          `${formatInteger(closedDays)} closed station-days`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Uptime per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <RateTrendChart
          data={dailyUptime.map((day, index) => {
            const previousDay = previousDailyUptime?.[index]
            return {
              day: day.day,
              value: roundToOneDecimal(percentOf(day.upHours, day.openHours)),
              previousValue: previousDay
                ? roundToOneDecimal(percentOf(previousDay.upHours, previousDay.openHours))
                : null,
            }
          })}
          label="Uptime"
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      <DashboardPanel
        title={isAllStations ? "By station" : "Station detail"}
        description={`Green is ${LOW_UPTIME_PERCENT}% or higher, amber is below. "Data used" shows which signals counted as up.`}
      >
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
              const rate = percentOf(row.upHours, row.openHours)
              return (
                <TableRow key={row.station}>
                  <TableCell className="font-medium">
                    {getStationName(row.station)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${rate ?? 0}%`,
                            backgroundColor:
                              rate !== null && rate >= LOW_UPTIME_PERCENT
                                ? CHART_COLORS.good
                                : CHART_COLORS.warning,
                          }}
                        />
                      </div>
                      <span className="w-14 text-right tabular-nums">
                        {rate === null ? "--" : formatPercent(rate)}
                      </span>
                    </div>
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {describeDataSources(row).map((source) => (
                        <StatusBadge key={source}>{source}</StatusBadge>
                      ))}
                    </div>
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