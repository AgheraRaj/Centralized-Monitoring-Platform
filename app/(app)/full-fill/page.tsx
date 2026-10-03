import { DashboardPanel } from "@/components/dashboard-panel"
import { FullFillChart } from "@/components/full-fill/full-fill-chart"
import { VehicleClassChart } from "@/components/full-fill/vehicle-class-chart"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
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
import {
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "@/lib/format"
import {
  describeVehicleClassRanges,
  FULL_FILL_THRESHOLD_BAR,
} from "@/lib/full-fill"
import {
  getComparisonRange,
  percentOf,
  pointChange,
  sumOf,
} from "@/lib/overview"
import {
  getDailyFullFill,
  getFullFillBreakdown,
  getFullFillByVehicleClass,
  getUnmeasuredFillCount,
} from "@/lib/queries/full-fill"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type FullFillPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

type DayCounts = { fullFills: number; belowFills: number }

function measuredIn(day: DayCounts) {
  return day.fullFills + day.belowFills
}

// Full-fill rate of one day, or null on a day without measured fills.
function rateOfDay(day: DayCounts) {
  return percentOf(day.fullFills, measuredIn(day))
}

function rateOfDays(days: DayCounts[]) {
  return percentOf(
    sumOf(days, (day) => day.fullFills),
    sumOf(days, measuredIn)
  )
}

function roundToOneDecimal(value: number | null) {
  return value === null ? null : Number(value.toFixed(1))
}

export default async function FullFillPage({ searchParams }: FullFillPageProps) {
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

  const { station, range } = filters
  const isByStation = station === ALL_STATIONS
  const stationLabel = isByStation ? "All stations" : getStationName(station)

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [
    dailyFullFill,
    previousDailyFullFill,
    breakdown,
    vehicleClassFills,
    unmeasuredFills,
  ] = await Promise.all([
    getDailyFullFill({ station, range }),
    previousRange
      ? getDailyFullFill({ station, range: previousRange })
      : Promise.resolve(null),
    getFullFillBreakdown({ station, range }),
    getFullFillByVehicleClass({ station, range }),
    getUnmeasuredFillCount({ station, range }),
  ])

  // ---- totals and comparison with the previous period
  const fullFills = sumOf(dailyFullFill, (day) => day.fullFills)
  const belowFills = sumOf(dailyFullFill, (day) => day.belowFills)
  const measuredFills = fullFills + belowFills
  const rate = rateOfDays(dailyFullFill)
  const previousRate = previousDailyFullFill ? rateOfDays(previousDailyFullFill) : null
  const averageEndPressure =
    measuredFills > 0
      ? sumOf(breakdown, (row) => row.averageEndPressure * row.fills) / measuredFills
      : null

  // Best and lowest day. Days with very few fills (for example a mostly closed
  // Sunday) are skipped, because a handful of fills gives a misleading rate.
  const activeDays = dailyFullFill.filter((day) => measuredIn(day) > 0)
  const minimumFills =
    activeDays.length > 0 ? (measuredFills / activeDays.length) * 0.1 : 0
  const dayRates = activeDays
    .filter((day) => measuredIn(day) >= minimumFills)
    .map((day) => ({ day: day.day, rate: (day.fullFills / measuredIn(day)) * 100 }))
  const bestDay = dayRates.reduce<(typeof dayRates)[number] | null>(
    (best, day) => (best === null || day.rate > best.rate ? day : best),
    null
  )
  const lowestDay = dayRates.reduce<(typeof dayRates)[number] | null>(
    (lowest, day) => (lowest === null || day.rate < lowest.rate ? day : lowest),
    null
  )

  const metrics: Metric[] = [
    {
      label: `At or above ${FULL_FILL_THRESHOLD_BAR} bar`,
      value: formatInteger(fullFills),
      note: rate === null ? undefined : `${formatPercent(rate)} of measured fills`,
    },
    {
      label: `Below ${FULL_FILL_THRESHOLD_BAR} bar`,
      value: formatInteger(belowFills),
      note: rate === null ? undefined : `${formatPercent(100 - rate)} of measured fills`,
    },
    {
      label: "Average end pressure",
      value: averageEndPressure === null ? "--" : formatDecimal(averageEndPressure),
      unit: "bar",
    },
    {
      label: "Best day",
      value: bestDay ? formatPercent(bestDay.rate) : "--",
      note: bestDay ? formatDate(bestDay.day) : undefined,
    },
    {
      label: "Lowest day",
      value: lowestDay ? formatPercent(lowestDay.rate) : "--",
      note: lowestDay ? formatDate(lowestDay.day) : undefined,
    },
  ]

  const headerNote =
    `A full fill ends at or above ${FULL_FILL_THRESHOLD_BAR} bar. Fills whose end pressure is missing or impossible` +
    (unmeasuredFills > 0 ? ` (${formatInteger(unmeasuredFills)} in this period)` : "") +
    " are left out of the rate."

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Full-fill rate"
        stationLabel={stationLabel}
        range={range}
        note={headerNote}
      />

      <HeroPanel
        label="Full-fill rate"
        value={rate === null ? "--" : formatPercent(rate)}
        change={
          hasComparison && (
            <ChangeBadge change={pointChange(rate, previousRate)} unit="pp" />
          )
        }
        chips={[
          `${formatInteger(fullFills)} full fills`,
          `${formatInteger(belowFills)} below ${FULL_FILL_THRESHOLD_BAR} bar`,
          averageEndPressure === null
            ? "Average pressure --"
            : `${formatDecimal(averageEndPressure)} bar average`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Full-fill rate per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <RateTrendChart
          data={dailyFullFill.map((day, index) => {
            const previousDay = previousDailyFullFill?.[index]
            return {
              day: day.day,
              value: roundToOneDecimal(rateOfDay(day)),
              previousValue: previousDay ? roundToOneDecimal(rateOfDay(previousDay)) : null,
            }
          })}
          label="Full-fill rate"
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Fills per day"
          description={`Fills ending at or above and below ${FULL_FILL_THRESHOLD_BAR} bar`}
        >
          <FullFillChart data={dailyFullFill} />
        </DashboardPanel>

        <DashboardPanel
          title="Fills by vehicle class"
          description={`Estimated from fill size, not recorded by the dispenser. ${describeVehicleClassRanges().join(" · ")}.`}
        >
          <VehicleClassChart data={vehicleClassFills} />
        </DashboardPanel>
      </div>

      <DashboardPanel title={isByStation ? "By station" : "By dispenser"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isByStation ? "Station" : "Dispenser"}</TableHead>
              <TableHead className="text-right">Fills</TableHead>
              <TableHead className="text-right">Full-fill rate</TableHead>
              <TableHead className="text-right">Avg end pressure (bar)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((row) => {
              const rowRate = percentOf(row.fullFills, row.fills) ?? 0
              return (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">
                    {isByStation ? getStationName(row.label) : row.label}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInteger(row.fills)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${rowRate}%`, backgroundColor: CHART_COLORS.good }}
                        />
                      </div>
                      <span className="w-14 text-right tabular-nums">
                        {formatPercent(rowRate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(row.averageEndPressure)}
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