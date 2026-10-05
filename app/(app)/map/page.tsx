import { DashboardPanel } from "@/components/dashboard-panel"
import { StationMap } from "@/components/map/station-map"
import {
  STATUS_COLORS,
  type StationMapData,
  type StationStatus,
} from "@/components/map/types"
import { PageHeader } from "@/components/vehicles/page-header"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import {
  getCapacityKgPerHour,
  getRatedCapacityKgPerDay,
} from "@/lib/dispenser-capacity"
import { getDispenserSummary } from "@/lib/queries/dispensers"
import { getDispenserDetails } from "@/lib/queries/map"
import { getStationDownHours, getStationUptime } from "@/lib/queries/uptime"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, STATIONS, type StationFilter } from "@/lib/stations"
import { STATION_LOCATIONS } from "@/lib/station-locations"
import { getUptimeTone } from "@/lib/uptime-status"

type MapPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

// A failed query (for example a view that is not created yet) only empties its
// own part of the page instead of breaking the whole map.
async function settle<T>(name: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch (error) {
    console.error(`[map] ${name} failed`, error)
    return fallback
  }
}

const STATUS_LABELS: Record<StationStatus, string> = {
  good: "Healthy",
  low: "Low uptime",
  critical: "Critical",
  nodata: "No data",
}

export default async function MapPage({ searchParams }: MapPageProps) {
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

  const { range } = filters
  const all = { station: ALL_STATIONS as StationFilter, range }

  const [uptimeRows, downRows, summaryRows, dispenserRows] = await Promise.all([
    settle("uptime", getStationUptime(all), []),
    settle("down hours", getStationDownHours(all), []),
    settle("dispenser summary", getDispenserSummary(all), []),
    settle("dispenser details", getDispenserDetails(range), []),
  ])

  const stations: StationMapData[] = STATIONS.map((station) => {
    const location = STATION_LOCATIONS[station.code]
    const uptimeRow = uptimeRows.find((row) => row.station === station.code)
    const summary = summaryRows.find((row) => row.station === station.code)
    const down = downRows.find((row) => row.station === station.code)
    const dispensers = dispenserRows.filter((row) => row.station === station.code)

    const uptime =
      uptimeRow && uptimeRow.openHours > 0
        ? (uptimeRow.upHours / uptimeRow.openHours) * 100
        : null
    const status: StationStatus = getUptimeTone(uptime) ?? "nodata"

    const notUpHours = uptimeRow ? uptimeRow.openHours - uptimeRow.upHours : 0
    const downHours = uptimeRow ? (down?.downHours ?? 0) : null
    const priced = dispensers
      .map((row) => row.unitPrice)
      .filter((price): price is number => price !== null && price > 0)

    const vehicles = summary?.vehicles ?? 0
    const kg = summary?.kg ?? 0
    const activeDays = summary?.activeDays ?? 0
    const dispenserCount = summary?.dispensers ?? 0
    const ratedKgPerDay = getRatedCapacityKgPerDay(station.code, dispenserCount)
    const averageDailyKg = activeDays > 0 ? kg / activeDays : 0

    return {
      code: station.code,
      name: station.name,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      status,
      statusLabel: STATUS_LABELS[status],
      uptime,
      upHours: uptimeRow?.upHours ?? 0,
      openHours: uptimeRow?.openHours ?? 0,
      closedDays: uptimeRow?.closedDays ?? 0,
      downHours,
      idleHours: downHours === null ? null : Math.max(notUpHours - downHours, 0),
      hasCompressorSignal: uptimeRow?.hasCompressorSignal ?? false,
      hasFlowSignal: uptimeRow?.hasFlowSignal ?? false,
      dispensers: dispenserCount,
      vehicles,
      kg,
      activeDays,
      averagePerActiveDay: activeDays > 0 ? vehicles / activeDays : 0,
      ratedKgPerDay,
      capacityKgPerHour: getCapacityKgPerHour(station.code),
      utilization: ratedKgPerDay > 0 ? (averageDailyKg / ratedKgPerDay) * 100 : null,
      unitRate:
        priced.length > 0 ? priced.reduce((a, b) => a + b, 0) / priced.length : null,
      minRate: priced.length > 0 ? Math.min(...priced) : null,
      maxRate: priced.length > 0 ? Math.max(...priced) : null,
      lastFillAt:
        dispensers
          .map((row) => row.lastFillAt)
          .filter((value): value is string => value !== null)
          .sort()
          .at(-1) ?? null,
      dispenserRows: dispensers.map(({ serial, fills, kg: dispenserKg, lastFillAt, unitPrice }) => ({
        serial,
        fills,
        kg: dispenserKg,
        lastFillAt,
        unitPrice: unitPrice !== null && unitPrice > 0 ? unitPrice : null,
      })),
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Map view"
        stationLabel="All stations"
        range={range}
        note="Hover a marker for a quick summary and click it for full station details. Marker colour follows uptime. Unit rate is the latest price on the station's dispensers."
      />
      <StationMap stations={stations} statusColors={STATUS_COLORS} />
    </div>
  )
}