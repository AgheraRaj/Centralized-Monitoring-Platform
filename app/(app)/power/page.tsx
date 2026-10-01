import { DashboardPanel } from "@/components/dashboard-panel"
import { KpiCard } from "@/components/kpi-card"
import { OutageChart } from "@/components/power/outage-chart"
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
import { formatDate, formatInteger } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import {
  getDailyOutages,
  getLatestOutages,
  getOutageSummary,
} from "@/lib/queries/power-outages"
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

  if (station !== ALL_STATIONS && !POWER_MONITORED_STATIONS.includes(station)) {
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

  const [summary, dailyOutages, latestOutages] = await Promise.all([
    getOutageSummary({ station, range }),
    getDailyOutages({ station, range }),
    getLatestOutages({ station, range }),
  ])

  const stationLabel =
    station === ALL_STATIONS ? "All monitored stations" : getStationName(station)
  const notMonitored = STATIONS.filter(
    (candidate) => !POWER_MONITORED_STATIONS.includes(candidate.code)
  ).map((candidate) => candidate.name)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Power outages</h1>
          <p className="text-sm text-muted-foreground">
            {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
          </p>
          <p className="text-sm text-muted-foreground">
            Estimated from the supply voltage on the compressor meters: below half
            of normal for 10 minutes or more. The database has no power event log.
          </p>
          {station === ALL_STATIONS && (
            <p className="text-sm text-muted-foreground">
              No voltage data for: {notMonitored.join(", ")}.
            </p>
          )}
        </div>
        <RangeSelector />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated outages" value={formatInteger(summary.outages)} />
        <KpiCard
          label="Estimated downtime"
          value={formatDuration(summary.totalMinutes)}
        />
        <KpiCard
          label="Longest outage"
          value={formatDuration(summary.longestMinutes)}
        />
        <KpiCard
          label="Fills during outages"
          value={formatInteger(summary.fillsDuring)}
          hint="Close to 0 if these were real power cuts"
        />
      </div>

      <DashboardPanel title="Outage minutes per day">
        <OutageChart data={dailyOutages} />
      </DashboardPanel>

      <DashboardPanel title="Latest outages">
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
                <TableCell className="font-medium">
                  {getStationName(outage.station)}
                </TableCell>
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