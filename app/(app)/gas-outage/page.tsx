import { DashboardPanel } from "@/components/dashboard-panel"
import { PressureChart } from "@/components/gas/pressure-chart"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { OutageChart } from "@/components/power/outage-chart"
import { SortableTable, type SortableRow } from "@/components/sortable-table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { CHART_COLORS } from "@/lib/chart-colors"
import type { DateRange } from "@/lib/date-range"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import {
  GAS_DRY_OUT_MIN_MINUTES,
  GAS_HIGH_BANK_LIMIT_BAR,
  GAS_INLET_LIMIT_BAR,
} from "@/lib/gas-outage"
import { getComparisonRange, relativeChange } from "@/lib/overview"
import {
  getDailyGasPressure,
  getGasDryOutEvents,
  getGasMonitoredStations,
  type GasDryOutEvent,
} from "@/lib/queries/gas-outages"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName, STATIONS } from "@/lib/stations"

type GasOutagePageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

// Every calendar day of the range as YYYY-MM-DD.
function listDays(range: DateRange) {
  const days: string[] = []
  const end = Date.parse(`${range.to}T00:00:00Z`)
  for (let time = Date.parse(`${range.from}T00:00:00Z`); time <= end; time += 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

// Dry-out minutes per day; an event counts on the day it started.
function minutesPerDay(events: GasDryOutEvent[], range: DateRange) {
  const totals = new Map<string, number>()
  for (const event of events) {
    const day = event.startedAt.slice(0, 10)
    totals.set(day, (totals.get(day) ?? 0) + event.durationMinutes)
  }
  return listDays(range).map((day) => ({ day, minutes: totals.get(day) ?? 0 }))
}

export default async function GasOutagePage({ searchParams }: GasOutagePageProps) {
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
  const isAllStations = station === ALL_STATIONS

  // Stations that have gas pressure readings in the database at all.
  const monitoredCodes = await getGasMonitoredStations()
  const monitored = STATIONS.filter((candidate) => monitoredCodes.includes(candidate.code))
  const notMonitored: string[] = monitored.length > 0
    ? STATIONS.filter((candidate) => !monitoredCodes.includes(candidate.code)).map(
        (candidate) => candidate.name
      )
    : []

  if (!isAllStations && notMonitored.includes(getStationName(station))) {
    return (
      <DashboardPanel title={`No gas data for ${getStationName(station)}`}>
        <p className="text-sm text-muted-foreground">
          The database has no gas event log, and this station has no gas inlet or
          high-bank pressure readings, so gas dry-outs cannot be estimated. Choose All
          stations or one of: {monitored.map((item) => item.name).join(", ")}.
        </p>
      </DashboardPanel>
    )
  }

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [events, previousEvents, dailyPressure] = await Promise.all([
    getGasDryOutEvents({ station, range }),
    previousRange ? getGasDryOutEvents({ station, range: previousRange }) : Promise.resolve(null),
    getDailyGasPressure({ station, range }),
  ])

  const stationLabel = isAllStations ? "All stations" : getStationName(station)

  if (dailyPressure.every((day) => day.lowestInlet === null && day.lowestHighBank === null)) {
    return (
      <DashboardPanel title={`No gas pressure data for ${stationLabel}`}>
        <p className="text-sm text-muted-foreground">
          No gas inlet or high-bank pressure readings were found in this period. Choose
          another date range or station.
        </p>
      </DashboardPanel>
    )
  }

  const daily = minutesPerDay(events, range)
  const previousDaily = previousRange && previousEvents ? minutesPerDay(previousEvents, previousRange) : null

  const totalMinutes = events.reduce((sum, event) => sum + event.durationMinutes, 0)
  const previousTotalMinutes = previousEvents
    ? previousEvents.reduce((sum, event) => sum + event.durationMinutes, 0)
    : 0
  const longestMinutes = events.reduce((max, event) => Math.max(max, event.durationMinutes), 0)
  const daysAffected = daily.filter((day) => day.minutes > 0).length
  const worstDay = daily.reduce<(typeof daily)[number] | null>(
    (worst, day) => (day.minutes > 0 && (worst === null || day.minutes > worst.minutes) ? day : worst),
    null
  )

  const pressureValues = (pick: "lowestInlet" | "lowestHighBank") =>
    dailyPressure.map((day) => day[pick]).filter((value): value is number => value !== null)
  const lowestInlet = Math.min(...pressureValues("lowestInlet"))
  const lowestHighBank = Math.min(...pressureValues("lowestHighBank"))

  const metrics: Metric[] = [
    {
      label: "Total dry-out time",
      value: formatDuration(totalMinutes),
      note: "All dry-out events added together",
      change: hasComparison && previousEvents && (
        <ChangeBadge
          change={relativeChange(totalMinutes, previousTotalMinutes)}
          unit="%"
          goodWhen="down"
        />
      ),
    },
    {
      label: "Longest dry-out",
      value: formatDuration(longestMinutes),
      note: "The single longest event",
    },
    {
      label: "Days with dry-outs",
      value: formatInteger(daysAffected),
      note: `Days with at least one event, of ${formatInteger(daily.length)}`,
    },
    {
      label: "Worst day",
      value: worstDay ? formatDuration(worstDay.minutes) : "--",
      note: worstDay ? `${formatDate(worstDay.day)}, most dry-out time` : "No dry-outs",
    },
    {
      label: "Lowest inlet pressure",
      value: Number.isFinite(lowestInlet) ? lowestInlet.toFixed(1) : "--",
      unit: "bar",
      note: `Lowest reading in the period. Dry-out limit is ${GAS_INLET_LIMIT_BAR} bar`,
    },
    {
      label: "Lowest high-bank pressure",
      value: Number.isFinite(lowestHighBank) ? lowestHighBank.toFixed(1) : "--",
      unit: "bar",
      note: `Lowest reading in the period. Dry-out limit is ${GAS_HIGH_BANK_LIMIT_BAR} bar`,
    },
  ]

  // By station, longest dry-out time first.
  const byStationMap = new Map<string, { events: number; minutes: number; inlet: number; highBank: number }>()
  for (const event of events) {
    const current = byStationMap.get(event.station) ?? {
      events: 0,
      minutes: 0,
      inlet: Infinity,
      highBank: Infinity,
    }
    current.events += 1
    current.minutes += event.durationMinutes
    current.inlet = Math.min(current.inlet, event.lowestInlet ?? Infinity)
    current.highBank = Math.min(current.highBank, event.lowestHighBank ?? Infinity)
    byStationMap.set(event.station, current)
  }
  const byStation = [...byStationMap.entries()].sort((a, b) => b[1].minutes - a[1].minutes)
  const largestStationMinutes = Math.max(...byStation.map(([, row]) => row.minutes), 1)
  const barValue = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : "--")

  const stationRows: SortableRow[] = byStation.map(([code, row]) => ({
    id: code,
    cells: {
      station: { text: getStationName(code), sort: getStationName(code) },
      downtime: {
        text: formatDuration(row.minutes),
        sort: row.minutes,
        percent: (row.minutes / largestStationMinutes) * 100,
        color: CHART_COLORS.critical,
      },
      events: { text: formatInteger(row.events), sort: row.events },
      inlet: { text: barValue(row.inlet), sort: Number.isFinite(row.inlet) ? row.inlet : Infinity },
      highBank: {
        text: barValue(row.highBank),
        sort: Number.isFinite(row.highBank) ? row.highBank : Infinity,
      },
    },
  }))

  // Newest first.
  const latest = [...events].reverse()
  const eventRows: SortableRow[] = latest.map((event, index) => ({
    id: `${event.station}-${event.startedAt}`,
    cells: {
      started: { text: event.startedLabel, sort: latest.length - index },
      station: { text: getStationName(event.station), sort: getStationName(event.station) },
      duration: { text: formatDuration(event.durationMinutes), sort: event.durationMinutes },
      inlet: { text: barValue(event.lowestInlet ?? Infinity), sort: event.lowestInlet ?? Infinity },
      highBank: {
        text: barValue(event.lowestHighBank ?? Infinity),
        sort: event.lowestHighBank ?? Infinity,
      },
    },
  }))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Gas outages"
        stationLabel={stationLabel}
        range={range}
        note={`The database has no gas event log. A gas dry-out is estimated when the gas inlet pressure is ${GAS_INLET_LIMIT_BAR} bar or lower and the high-bank pressure is ${GAS_HIGH_BANK_LIMIT_BAR} bar or lower at the same time. Dry-outs shorter than ${GAS_DRY_OUT_MIN_MINUTES} minutes are ignored.${
          isAllStations && notMonitored.length > 0
            ? ` No gas pressure data is available for: ${notMonitored.join(", ")}.`
            : ""
        }`}
      />

      <HeroPanel
        label="Gas dry-out events"
        value={formatInteger(events.length)}
        change={
          hasComparison &&
          previousEvents && (
            <ChangeBadge
              change={relativeChange(events.length, previousEvents.length)}
              unit="%"
              goodWhen="down"
            />
          )
        }
        chips={[
          `${formatDuration(totalMinutes)} total dry-out time`,
          `${formatDuration(longestMinutes)} longest event`,
          `${formatDuration(events.length > 0 ? Math.round(totalMinutes / events.length) : 0)} average event`,
          `${formatInteger(daysAffected)} days affected`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Gas dry-out minutes per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <OutageChart
          data={daily.map((day, index) => ({
            day: day.day,
            minutes: day.minutes,
            previousMinutes: previousDaily?.[index]?.minutes ?? null,
          }))}
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      <DashboardPanel
        title="Lowest pressure per day"
        description={`Dashed lines mark the dry-out limits: ${GAS_INLET_LIMIT_BAR} bar for gas inlet and ${GAS_HIGH_BANK_LIMIT_BAR} bar for high bank. A dry-out needs both lines crossed together.`}
      >
        <PressureChart
          data={dailyPressure}
          inletLimit={GAS_INLET_LIMIT_BAR}
          highBankLimit={GAS_HIGH_BANK_LIMIT_BAR}
        />
      </DashboardPanel>

      {isAllStations && stationRows.length > 0 && (
        <DashboardPanel
          title="By station"
          description="Click a column heading to sort. Pressures are the lowest seen during dry-outs, in bar."
        >
          <SortableTable
            columns={[
              { key: "station", label: "Station", align: "left" },
              { key: "downtime", label: "Dry-out time" },
              { key: "events", label: "Dry-outs" },
              { key: "inlet", label: "Lowest inlet" },
              { key: "highBank", label: "Lowest high bank" },
            ]}
            rows={stationRows}
            pageSize={10}
          />
        </DashboardPanel>
      )}

      <DashboardPanel
        title="Dry-out events"
        description="Every dry-out in this period, newest first. Click a column heading to sort."
      >
        <SortableTable
          columns={[
            { key: "started", label: "Started", align: "left" },
            { key: "station", label: "Station", align: "left" },
            { key: "duration", label: "Duration" },
            { key: "inlet", label: "Lowest inlet (bar)" },
            { key: "highBank", label: "Lowest high bank (bar)" },
          ]}
          rows={eventRows}
          pageSize={10}
          emptyMessage="No gas dry-outs detected in this period."
        />
      </DashboardPanel>
    </div>
  )
}