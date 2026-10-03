import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { OutageChart } from "@/components/power/outage-chart"
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
import { CHART_COLORS } from "@/lib/chart-colors"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import { getComparisonRange, relativeChange, sumOf } from "@/lib/overview"
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
  const averageMinutes = summary.outages > 0 ? summary.totalMinutes / summary.outages : 0
  const worstStation = byStation[0]

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
      label: "Average outage",
      value: formatDuration(Math.round(averageMinutes)),
      note: "Per detected outage",
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
      label: "Fills during outages",
      value: formatInteger(summary.fillsDuring),
      note: "Close to 0 if these were real power cuts",
    },
  ]

  const largestStationMinutes = Math.max(...byStation.map((row) => row.totalMinutes), 1)

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
              ? `${getStationName(worstStation.station)} had the most downtime`
              : undefined
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Downtime</TableHead>
                <TableHead className="text-right">Outages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byStation.map((row) => (
                <TableRow key={row.station}>
                  <TableCell className="font-medium">{getStationName(row.station)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.totalMinutes / largestStationMinutes) * 100}%`,
                            backgroundColor: CHART_COLORS.critical,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right tabular-nums">
                        {formatDuration(row.totalMinutes)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.outages)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardPanel>
      )}

      <DashboardPanel title="Latest outages" description="Most recent 50 in this period">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Station</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Lowest voltage</TableHead>
              <TableHead className="text-right">Fills during</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {latestOutages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No outages detected in this period.
                </TableCell>
              </TableRow>
            )}
            {latestOutages.map((outage) => (
              <TableRow key={`${outage.station}-${outage.startedAt}`}>
                <TableCell>{outage.startedAt}</TableCell>
                <TableCell className="font-medium">{getStationName(outage.station)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDuration(outage.durationMinutes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(outage.lowestVolts)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(outage.fillsDuring)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardPanel>
    </div>
  )
}