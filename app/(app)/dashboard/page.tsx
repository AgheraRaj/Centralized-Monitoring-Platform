import { DashboardPanel } from "@/components/dashboard-panel"
import { KpiCard } from "@/components/kpi-card"
import { RangeSelector } from "@/components/range-selector"
import { DailyVehiclesChart } from "@/components/vehicles/daily-vehicles-chart"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import { FULL_FILL_THRESHOLD_BAR } from "@/lib/full-fill"
import { getDailyFullFill } from "@/lib/queries/full-fill"
import { getOutageSummary } from "@/lib/queries/power-outages"
import { getStationUptime } from "@/lib/queries/uptime"
import { getDailyVehicles } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import {
  ALL_STATIONS,
  getStationName,
  POWER_MONITORED_STATIONS,
} from "@/lib/stations"

type DashboardPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

// Each card loads on its own. If one query fails (for example its view has not
// been created yet), that card shows "--" and the rest of the page still works.
function valueOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null
}

function sumOf<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((sum, row) => sum + pick(row), 0)
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireSession()

  const filters = await getDashboardFilters(await searchParams)
  if (!filters) {
    return (
      <DashboardPanel title="No fill data found">
        <p className="text-sm text-muted-foreground">
          Run the SQL files in the db folder in pgAdmin, then run npm run db:refresh.
        </p>
      </DashboardPanel>
    )
  }

  const { station, range } = filters
  const hasPowerData =
    station === ALL_STATIONS || POWER_MONITORED_STATIONS.includes(station)

  const [dailyVehiclesResult, dailyFullFillResult, stationUptimeResult, outagesResult] =
    await Promise.allSettled([
      getDailyVehicles({ station, range }),
      getDailyFullFill({ station, range }),
      getStationUptime({ station, range }),
      hasPowerData ? getOutageSummary({ station, range }) : Promise.resolve(null),
    ])

  const dailyVehicles = valueOrNull(dailyVehiclesResult)
  const dailyFullFill = valueOrNull(dailyFullFillResult)
  const stationUptime = valueOrNull(stationUptimeResult)
  const outages = valueOrNull(outagesResult)

  const totalVehicles = dailyVehicles ? sumOf(dailyVehicles, (day) => day.vehicles) : null
  const totalKg = dailyVehicles ? sumOf(dailyVehicles, (day) => day.kg) : null

  const fullFills = dailyFullFill ? sumOf(dailyFullFill, (day) => day.fullFills) : 0
  const belowFills = dailyFullFill ? sumOf(dailyFullFill, (day) => day.belowFills) : 0
  const measuredFills = fullFills + belowFills
  const fullFillRate =
    dailyFullFill && measuredFills > 0 ? (fullFills / measuredFills) * 100 : null

  const upHours = stationUptime ? sumOf(stationUptime, (row) => row.upHours) : 0
  const openHours = stationUptime ? sumOf(stationUptime, (row) => row.openHours) : 0
  const uptime = stationUptime && openHours > 0 ? (upHours / openHours) * 100 : null

  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vehicles served"
          value={totalVehicles === null ? "--" : formatInteger(totalVehicles)}
          hint={totalKg === null ? undefined : `${formatInteger(totalKg)} kg dispensed`}
        />
        <KpiCard
          label="Full-fill rate"
          value={fullFillRate === null ? "--" : formatPercent(fullFillRate)}
          hint={`Fills ending at or above ${FULL_FILL_THRESHOLD_BAR} bar`}
        />
        <KpiCard
          label="Station uptime"
          value={uptime === null ? "--" : formatPercent(uptime)}
          hint="Up hours / open hours"
        />
        <KpiCard
          label="Power outage downtime"
          value={outages ? formatDuration(outages.totalMinutes) : "--"}
          hint={
            !hasPowerData
              ? "No voltage data for this station"
              : outages
                ? `${formatInteger(outages.outages)} estimated outages`
                : station === ALL_STATIONS
                  ? "Only stations with voltage data"
                  : undefined
          }
        />
      </div>

      <DashboardPanel title="Daily vehicles served">
        {dailyVehicles ? (
          <DailyVehiclesChart data={dailyVehicles} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not load the daily vehicles.
          </p>
        )}
      </DashboardPanel>
    </div>
  )
}