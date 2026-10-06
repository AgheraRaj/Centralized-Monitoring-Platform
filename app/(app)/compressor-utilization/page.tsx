import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { SortableTable, type SortableRow } from "@/components/sortable-table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { RateTrendChart } from "@/components/vehicles/rate-trend-chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import type { DateRange } from "@/lib/date-range"
import { formatDate, formatDecimal, formatInteger, formatPercent } from "@/lib/format"
import { getComparisonRange, pointChange, relativeChange } from "@/lib/overview"
import {
  getCompressorDailyRuns,
  parseCompressorUnit,
  type CompressorDayRow,
} from "@/lib/queries/compressors"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName, STATIONS } from "@/lib/stations"

type CompressorPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

const HOURS_PER_DAY = 24

function listDays(range: DateRange) {
  const days: string[] = []
  const end = Date.parse(`${range.to}T00:00:00Z`)
  for (let time = Date.parse(`${range.from}T00:00:00Z`); time <= end; time += 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

function sum(rows: CompressorDayRow[]) {
  return rows.reduce((total, row) => total + row.runHours, 0)
}

// Hours run divided by the hours in every day a compressor reported (24 each).
function utilizationOf(rows: CompressorDayRow[]) {
  return rows.length > 0 ? (sum(rows) / (rows.length * HOURS_PER_DAY)) * 100 : null
}

// Utilization per calendar day; null when no compressor reported that day.
function dailySeries(rows: CompressorDayRow[], range: DateRange) {
  const byDay = new Map<string, CompressorDayRow[]>()
  for (const row of rows) byDay.set(row.day, [...(byDay.get(row.day) ?? []), row])
  return listDays(range).map((day) => {
    const value = utilizationOf(byDay.get(day) ?? [])
    return { day, value: value === null ? null : Number(value.toFixed(1)) }
  })
}

export default async function CompressorUtilizationPage({ searchParams }: CompressorPageProps) {
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

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  // Both periods are read for every station, then narrowed to the selected one.
  const [allRows, allPreviousRows] = await Promise.all([
    getCompressorDailyRuns(range),
    previousRange ? getCompressorDailyRuns(previousRange) : Promise.resolve(null),
  ])

  const stationsWithData = STATIONS.filter((candidate) =>
    allRows.some((row) => row.station === candidate.code)
  )
  const stationsWithoutData = STATIONS.filter(
    (candidate) => !stationsWithData.includes(candidate)
  ).map((candidate) => candidate.name)

  if (!isAllStations && !stationsWithData.some((candidate) => candidate.code === station)) {
    return (
      <DashboardPanel title={`No compressor data for ${getStationName(station)}`}>
        <p className="text-sm text-muted-foreground">
          This station has no compressor running-hour readings in this period, so
          compressor utilization cannot be worked out.
          {stationsWithData.length > 0 &&
            ` Choose All stations or one of: ${stationsWithData.map((item) => item.name).join(", ")}.`}
        </p>
      </DashboardPanel>
    )
  }

  const rows = isAllStations ? allRows : allRows.filter((row) => row.station === station)
  const previousRows = allPreviousRows
    ? isAllStations
      ? allPreviousRows
      : allPreviousRows.filter((row) => row.station === station)
    : null

  const stationLabel = isAllStations ? "All stations" : getStationName(station)
  const utilization = utilizationOf(rows)
  const previousUtilization = previousRows ? utilizationOf(previousRows) : null
  const runHours = sum(rows)
  const previousRunHours = previousRows ? sum(previousRows) : 0
  const compressorCount = new Set(rows.map((row) => `${row.station}|${row.unit}`)).size
  const averageHoursPerDay = rows.length > 0 ? runHours / rows.length : 0

  const series = dailySeries(rows, range)
  const previousSeries = previousRows && previousRange ? dailySeries(previousRows, previousRange) : null
  const reportedDays = series.filter(
    (point): point is { day: string; value: number } => point.value !== null
  )
  const peakDay = reportedDays.reduce<(typeof reportedDays)[number] | null>(
    (top, point) => (top === null || point.value > top.value ? point : top),
    null
  )
  const lowestDay = reportedDays.reduce<(typeof reportedDays)[number] | null>(
    (bottom, point) => (bottom === null || point.value < bottom.value ? point : bottom),
    null
  )

  // Per compressor.
  const unitMap = new Map<string, { station: string; unit: string; hours: number; days: number }>()
  for (const row of rows) {
    const key = `${row.station}|${row.unit}`
    const current = unitMap.get(key) ?? { station: row.station, unit: row.unit, hours: 0, days: 0 }
    current.hours += row.runHours
    current.days += 1
    unitMap.set(key, current)
  }
  const units = [...unitMap.values()].map((item) => ({
    ...item,
    label: parseCompressorUnit(item.unit).label,
    utilization: (item.hours / (item.days * HOURS_PER_DAY)) * 100,
  }))
  const mostUsed = units.reduce<(typeof units)[number] | null>(
    (top, item) => (top === null || item.utilization > top.utilization ? item : top),
    null
  )

  const compressorRows: SortableRow[] = units
    .sort((a, b) => b.utilization - a.utilization)
    .map((item) => ({
      id: `${item.station}|${item.unit}`,
      cells: {
        station: { text: getStationName(item.station), sort: getStationName(item.station) },
        compressor: { text: item.label, sort: item.label },
        hours: { text: `${formatDecimal(item.hours)} h`, sort: item.hours },
        days: { text: formatInteger(item.days), sort: item.days },
        average: { text: `${formatDecimal(item.hours / item.days)} h`, sort: item.hours / item.days },
        utilization: {
          text: formatPercent(item.utilization),
          sort: item.utilization,
          percent: item.utilization,
          color: CHART_COLORS.primary,
        },
      },
    }))

  // Per station.
  const stationRows: SortableRow[] = stationsWithData
    .filter((candidate) => isAllStations || candidate.code === station)
    .map((candidate) => {
      const stationData = rows.filter((row) => row.station === candidate.code)
      const stationUnits = new Set(stationData.map((row) => row.unit)).size
      const value = utilizationOf(stationData) ?? 0
      return {
        id: candidate.code,
        cells: {
          station: { text: candidate.name, sort: candidate.name },
          compressors: { text: formatInteger(stationUnits), sort: stationUnits },
          hours: { text: `${formatDecimal(sum(stationData))} h`, sort: sum(stationData) },
          utilization: {
            text: formatPercent(value),
            sort: value,
            percent: value,
            color: CHART_COLORS.primary,
          },
        },
      }
    })

  const metrics: Metric[] = [
    {
      label: "Compressors reporting",
      value: formatInteger(compressorCount),
      note: "With running-hour readings in this period",
    },
    {
      label: "Running hours",
      value: formatDecimal(runHours),
      unit: "h",
      note: "All compressors added together",
      change: hasComparison && previousRows && (
        <ChangeBadge change={relativeChange(runHours, previousRunHours)} unit="%" />
      ),
    },
    {
      label: "Average run per day",
      value: formatDecimal(averageHoursPerDay),
      unit: "h",
      note: "Per compressor, per reporting day",
    },
    {
      label: "Peak day",
      value: peakDay ? formatPercent(peakDay.value) : "--",
      note: peakDay ? formatDate(peakDay.day) : undefined,
    },
    {
      label: "Lowest day",
      value: lowestDay ? formatPercent(lowestDay.value) : "--",
      note: lowestDay ? formatDate(lowestDay.day) : undefined,
    },
    {
      label: "Most used compressor",
      value: mostUsed ? formatPercent(mostUsed.utilization) : "--",
      note: mostUsed
        ? `${getStationName(mostUsed.station)} · ${mostUsed.label}`
        : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Compressor utilization"
        stationLabel={stationLabel}
        range={range}
        note={`Estimated from the running-hour counter on each compressor. This shows how much of the time the compressors ran, not how hard they worked, because rated compressor capacity is not in the database.${
          isAllStations && stationsWithoutData.length > 0
            ? ` No compressor running-hour data is available for: ${stationsWithoutData.join(", ")}.`
            : ""
        }`}
      />

      <HeroPanel
        label="Compressor utilization"
        value={utilization === null ? "--" : formatPercent(utilization)}
        change={
          hasComparison && (
            <ChangeBadge change={pointChange(utilization, previousUtilization)} unit="pp" />
          )
        }
        chips={[
          `${formatDecimal(runHours)} h running`,
          `${formatInteger(compressorCount)} compressors`,
          `${formatDecimal(averageHoursPerDay)} h average per day`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Compressor utilization per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <RateTrendChart
          data={series.map((point, index) => ({
            day: point.day,
            value: point.value,
            previousValue: previousSeries?.[index]?.value ?? null,
          }))}
          label="Utilization"
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      {isAllStations && stationRows.length > 1 && (
        <DashboardPanel
          title="By station"
          description="Click a column heading to sort. Utilization is running hours as a share of 24 hours per reporting day."
        >
          <SortableTable
            columns={[
              { key: "station", label: "Station", align: "left" },
              { key: "compressors", label: "Compressors" },
              { key: "hours", label: "Running hours" },
              { key: "utilization", label: "Utilization" },
            ]}
            rows={stationRows}
            pageSize={10}
          />
        </DashboardPanel>
      )}

      <DashboardPanel
        title="By compressor"
        description="Most used first. Click a column heading to sort."
      >
        <SortableTable
          columns={[
            { key: "station", label: "Station", align: "left" },
            { key: "compressor", label: "Compressor", align: "left" },
            { key: "hours", label: "Running hours" },
            { key: "days", label: "Days reporting" },
            { key: "average", label: "Avg per day" },
            { key: "utilization", label: "Utilization" },
          ]}
          rows={compressorRows}
          pageSize={10}
          emptyMessage="No compressor readings in this period."
        />
      </DashboardPanel>
    </div>
  )
}