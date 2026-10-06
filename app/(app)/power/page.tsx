import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { OutageChart } from "@/components/power/outage-chart"
import { SortableTable, type SortableRow } from "@/components/sortable-table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { CHART_COLORS } from "@/lib/chart-colors"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import { getComparisonRange, pointChange, relativeChange } from "@/lib/overview"
import {
  getDailyOutages,
  getLatestOutages,
  getOutageSummary,
  getOutagesByStation,
} from "@/lib/queries/power-outages"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import {
  ALL_STATIONS,
  getStationName,
  POWER_MONITORED_STATIONS,
  STATIONS,
} from "@/lib/stations"

type PowerPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

export default async function PowerPage({ searchParams }: PowerPageProps) {
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

  if (!isAllStations && !POWER_MONITORED_STATIONS.includes(station)) {
    return (
      <DashboardPanel title={`No power data for ${getStationName(station)}`}>
        <p className="text-sm text-muted-foreground">
          This station has no voltage or current readings in the database, so
          power outages cannot be estimated. Choose All stations or one of:{" "}
          {POWER_MONITORED_STATIONS.map(getStationName).join(", ")}.
        </p>
      </DashboardPanel>
    )
  }

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [summary, previousSummary, dailyOutages, previousDailyOutages, latestOutages, byStation] =
    await Promise.all([
      getOutageSummary({ station, range }),
      previousRange ? getOutageSummary({ station, range: previousRange }) : Promise.resolve(null),
      getDailyOutages({ station, range }),
      previousRange ? getDailyOutages({ station, range: previousRange }) : Promise.resolve(null),
      getLatestOutages({ station, range }),
      getOutagesByStation({ station, range }),
    ])

  const stationLabel = isAllStations ? "All monitored stations" : getStationName(station)
  const notMonitored = STATIONS.filter(
    (candidate) => !POWER_MONITORED_STATIONS.includes(candidate.code)
  ).map((candidate) => candidate.name)

  const daysWithOutage = dailyOutages.filter((day) => day.minutes > 0).length
  const worstDay = dailyOutages.reduce<(typeof dailyOutages)[number] | null>(
    (worst, day) => (day.minutes > 0 && (worst === null || day.minutes > worst.minutes) ? day : worst),
    null
  )
  const worstStation = byStation[0]
  const lastOutage = latestOutages[0]

  // Share of the period the monitored stations had power.
  const monitoredCount = isAllStations ? POWER_MONITORED_STATIONS.length : 1
  const availability = (totalMinutes: number, days: number) =>
    days > 0 ? Math.max(0, (1 - totalMinutes / (days * 1440 * monitoredCount)) * 100) : null
  const powerAvailability = availability(summary.totalMinutes, dailyOutages.length)
  const previousAvailability =
    previousSummary && previousDailyOutages
      ? availability(previousSummary.totalMinutes, previousDailyOutages.length)
      : null

  const metrics: Metric[] = [
    {
      label: "Estimated downtime",
      value: formatDuration(summary.totalMinutes),
      change: hasComparison && previousSummary && (
        <ChangeBadge
          change={relativeChange(summary.totalMinutes, previousSummary.totalMinutes)}
          unit="%"
          goodWhen="down"
        />
      ),
    },
    {
      label: "Longest outage",
      value: formatDuration(summary.longestMinutes),
    },
    {
      label: "Days with outages",
      value: formatInteger(daysWithOutage),
      note: `Of ${formatInteger(dailyOutages.length)} days`,
    },
    {
      label: "Worst day",
      value: worstDay ? formatDuration(worstDay.minutes) : "--",
      note: worstDay ? formatDate(worstDay.day) : "No outages",
    },
    {
      label: "Power availability",
      value: powerAvailability === null ? "--" : formatPercent(powerAvailability),
      note: "Share of the period with power",
      change: hasComparison && powerAvailability !== null && (
        <ChangeBadge change={pointChange(powerAvailability, previousAvailability)} unit="pp" />
      ),
    },
    isAllStations
      ? {
          label: "Most affected station",
          value: worstStation ? getStationName(worstStation.station) : "--",
          note: worstStation
            ? `${formatDuration(worstStation.totalMinutes)} downtime`
            : "No outages",
        }
      : {
          label: "Last outage",
          value: lastOutage ? lastOutage.startedAt.split(",")[0] : "--",
          note: lastOutage
            ? `${lastOutage.startedAt.split(",")[1]?.trim()} · ${formatDuration(lastOutage.durationMinutes)}`
            : "No outages",
        },
  ]

  const largestStationMinutes = Math.max(...byStation.map((row) => row.totalMinutes), 1)

  const stationRows: SortableRow[] = byStation.map((row) => ({
    id: row.station,
    cells: {
      station: { text: getStationName(row.station), sort: getStationName(row.station) },
      downtime: {
        text: formatDuration(row.totalMinutes),
        sort: row.totalMinutes,
        percent: (row.totalMinutes / largestStationMinutes) * 100,
        color: CHART_COLORS.critical,
      },
      outages: { text: formatInteger(row.outages), sort: row.outages },
    },
  }))

  // The query returns newest first, so the position gives the date order.
  const outageRows: SortableRow[] = latestOutages.map((outage, index) => ({
    id: `${outage.station}-${outage.startedAt}`,
    cells: {
      started: { text: outage.startedAt, sort: latestOutages.length - index },
      station: { text: getStationName(outage.station), sort: getStationName(outage.station) },
      duration: { text: formatDuration(outage.durationMinutes), sort: outage.durationMinutes },
      volts: { text: formatInteger(outage.lowestVolts), sort: outage.lowestVolts },
      fills: { text: formatInteger(outage.fillsDuring), sort: outage.fillsDuring },
    },
  }))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Power outages"
        stationLabel={stationLabel}
        range={range}
        note={`Estimated from the supply voltage on the compressor meters: below half of normal for 10 minutes or more. The database has no power event log.${
          isAllStations ? ` No voltage data for: ${notMonitored.join(", ")}.` : ""
        }`}
      />

      <HeroPanel
        label="Estimated outages"
        value={formatInteger(summary.outages)}
        change={
          hasComparison &&
          previousSummary && (
            <ChangeBadge
              change={relativeChange(summary.outages, previousSummary.outages)}
              unit="%"
              goodWhen="down"
            />
          )
        }
        chips={[
          `${formatDuration(summary.totalMinutes)} downtime`,
          `${formatDuration(summary.longestMinutes)} longest`,
          `${formatInteger(daysWithOutage)} days affected`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Outage minutes per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <OutageChart
          data={dailyOutages.map((day, index) => ({
            day: day.day,
            minutes: day.minutes,
            previousMinutes: previousDailyOutages?.[index]?.minutes ?? null,
          }))}
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      {isAllStations && byStation.length > 0 && (
        <DashboardPanel
          title="By station"
          description={
            worstStation
              ? `${getStationName(worstStation.station)} had the most downtime. Click a column heading to sort.`
              : undefined
          }
        >
          <SortableTable
            columns={[
              { key: "station", label: "Station", align: "left" },
              { key: "downtime", label: "Downtime" },
              { key: "outages", label: "Outages" },
            ]}
            rows={stationRows}
          />
        </DashboardPanel>
      )}

      <DashboardPanel
        title="Latest outages"
        description="Most recent 50 in this period. Click a column heading to sort."
      >
        <SortableTable
          columns={[
            { key: "started", label: "Started", align: "left" },
            { key: "station", label: "Station", align: "left" },
            { key: "duration", label: "Duration" },
            { key: "volts", label: "Lowest voltage" },
            { key: "fills", label: "Fills during" },
          ]}
          rows={outageRows}
          emptyMessage="No outages detected in this period."
        />
      </DashboardPanel>
    </div>
  )
}