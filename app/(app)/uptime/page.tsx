import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { StationDetailTable } from "@/components/uptime/station-detail-table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { RateTrendChart } from "@/components/vehicles/rate-trend-chart"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import {
  getComparisonRange,
  percentOf,
  pointChange,
  relativeChange,
  sumOf,
} from "@/lib/overview"
import {
  getDailyUptime,
  getStationDownHours,
  getStationUptime,
} from "@/lib/queries/uptime"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"
import {
  CRITICAL_UPTIME_PERCENT,
  LOW_UPTIME_PERCENT,
  STATION_DOWN_MAX_PRESSURE_BAR,
} from "@/lib/uptime-status"
import type { StationDetailRow } from "@/lib/uptime-table"

type UptimePageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

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

  const [dailyUptime, previousDailyUptime, stationUptime, downByStation, previousDownByStation] =
    await Promise.all([
      getDailyUptime({ station, range }),
      previousRange
        ? getDailyUptime({ station, range: previousRange })
        : Promise.resolve(null),
      getStationUptime({ station, range }),
      // If the Down/Idle split cannot be loaded, the page still works and shows "--" for it.
      getStationDownHours({ station, range }).catch(() => null),
      previousRange
        ? getStationDownHours({ station, range: previousRange }).catch(() => null)
        : Promise.resolve(null),
    ])

  // ---- totals and comparison with the previous period
  const upHours = sumOf(stationUptime, (row) => row.upHours)
  const openHours = sumOf(stationUptime, (row) => row.openHours)
  const closedDays = sumOf(stationUptime, (row) => row.closedDays)
  const closedHours = sumOf(stationUptime, (row) => row.closedHours)
  const uptime = uptimeOf(stationUptime)

  const previousUptime = previousDailyUptime ? uptimeOf(previousDailyUptime) : null

  // Every open hour that is not up is either DOWN (low priority pressure) or IDLE.
  // So up + idle + down always adds up to the open hours.
  const notUpHours = openHours - upHours
  const downHours = downByStation ? sumOf(downByStation, (row) => row.downHours) : null
  const idleHours = downHours === null ? null : notUpHours - downHours
  const previousDownHours = previousDownByStation
    ? sumOf(previousDownByStation, (row) => row.downHours)
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

  // Days are in date order. When several days tie (many days can sit at 100%),
  // the later day wins, so the card shows the most recent one.
  const best = ranked.reduce<(typeof ranked)[number] | null>(
    (top, item) =>
      top === null || item.rate > top.rate || (!isAllStations && item.rate === top.rate)
        ? item
        : top,
    null
  )
  const lowest = ranked.reduce<(typeof ranked)[number] | null>(
    (bottom, item) =>
      bottom === null || item.rate < bottom.rate || (!isAllStations && item.rate === bottom.rate)
        ? item
        : bottom,
    null
  )
  const metrics: Metric[] = [
    {
      label: "Hours up",
      value: formatInteger(upHours),
      note: `Of ${formatInteger(openHours)} open hours`,
    },
    {
      label: "Hours idle",
      value: idleHours === null ? "--" : formatInteger(idleHours),
      note: `No fill, compressor off, pressure above ${STATION_DOWN_MAX_PRESSURE_BAR} bar`,
    },
    {
      label: "Hours down",
      value: downHours === null ? "--" : formatInteger(downHours),
      change:
        hasComparison && downHours !== null ? (
          <ChangeBadge
            change={relativeChange(downHours, previousDownHours)}
            unit="%"
            goodWhen="down"
          />
        ) : undefined,
      note: `No fill, compressor off, pressure ${STATION_DOWN_MAX_PRESSURE_BAR} bar or below`,
    },
    {
      label: "Closed days",
      value: formatInteger(closedDays),
      note: "Station-days with no activity, left out",
    },
    {
      label: isAllStations ? "Highest station" : "Last Highest day",
      value: best ? formatPercent(best.rate) : "--",
      note: best?.name,
    },
    {
      label: isAllStations ? "Lowest station" : "Last Lowest day",
      value: lowest ? formatPercent(lowest.rate) : "--",
      note: lowest?.name,
    },
  ]

  // ---- one row per station for the sortable table
  const downHoursByStation = new Map(
    (downByStation ?? []).map((row) => [row.station, row.downHours])
  )
  const tableRows: StationDetailRow[] = stationUptime.map((row) => {
    const rowDownHours = downByStation ? (downHoursByStation.get(row.station) ?? 0) : null
    return {
      station: row.station,
      name: getStationName(row.station),
      rate: percentOf(row.upHours, row.openHours),
      upHours: row.upHours,
      downHours: rowDownHours,
      idleHours:
        rowDownHours === null ? null : row.openHours - row.upHours - rowDownHours,
      closedDays: row.closedDays,
      sources: describeDataSources(row),
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Station uptime"
        stationLabel={stationLabel}
        range={range}
        note={`An hour is up when the station has a fill, a compressor running-hour increase, or gas flow. Otherwise it is down (priority pressure ${STATION_DOWN_MAX_PRESSURE_BAR} bar or below) or idle (pressure above ${STATION_DOWN_MAX_PRESSURE_BAR} bar, or no pressure reading). Days with no activity at all are treated as closed and left out.`}
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
          ...(idleHours === null ? [] : [`${formatInteger(idleHours)} hours idle`]),
          ...(downHours === null ? [] : [`${formatInteger(downHours)} hours down`]),
          `${formatInteger(closedHours)} closed station hours`,
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
        description={`Green is ${LOW_UPTIME_PERCENT}% or higher, amber is between ${CRITICAL_UPTIME_PERCENT}% and ${LOW_UPTIME_PERCENT}%, red is below ${CRITICAL_UPTIME_PERCENT}%. "Data used" shows which signals counted as up.`}
      >
        <StationDetailTable rows={tableRows} />
      </DashboardPanel>
    </div>
  )
}