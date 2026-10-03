import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { HourHeatmapCard } from "@/components/overview/hour-heatmap-card"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import {
  StationRankingCard,
  type RankingRow,
} from "@/components/overview/station-ranking-card"
import { VehiclesTrendChart } from "@/components/overview/vehicles-trend-chart"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import {
  VehicleClassCard,
  VEHICLE_CLASS_COLORS,
} from "@/components/vehicles/vehicle-class-card"
import { WeekdayChart } from "@/components/vehicles/weekday-chart"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { formatDate, formatInteger } from "@/lib/format"
import {
  buildHourlyRows,
  getComparisonRange,
  percentOf,
  relativeChange,
  sumOf,
} from "@/lib/overview"
import { getHourlyVehicles } from "@/lib/queries/hourly-vehicles"
import {
  getDailyVehicles,
  getFillDateBounds,
  getStationSummary,
  getVehicleClassCounts,
} from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"
import { buildWeekdayAverages } from "@/lib/weekday-averages"

type VehiclesPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
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
  const isAllStations = station === ALL_STATIONS
  const stationLabel = isAllStations ? "All stations" : getStationName(station)

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [
    dailyVehicles,
    previousDailyVehicles,
    hourlyVehicles,
    stationSummary,
    classCounts,
    previousClassCounts,
  ] =
    await Promise.all([
      getDailyVehicles({ station, range }),
      previousRange
        ? getDailyVehicles({ station, range: previousRange })
        : Promise.resolve(null),
      getHourlyVehicles({ station, range }),
      isAllStations ? getStationSummary(range) : Promise.resolve(null),
      getVehicleClassCounts({ station, range }),
      previousRange
        ? getVehicleClassCounts({ station, range: previousRange })
        : Promise.resolve(null),
    ])

  // ---- totals and comparison with the previous period
  const totalVehicles = sumOf(dailyVehicles, (day) => day.vehicles)
  const totalKg = sumOf(dailyVehicles, (day) => day.kg)
  const previousVehicles = previousDailyVehicles
    ? sumOf(previousDailyVehicles, (day) => day.vehicles)
    : null
  const previousKg = previousDailyVehicles
    ? sumOf(previousDailyVehicles, (day) => day.kg)
    : null

  // Averages and the busiest/quietest day only look at days that had fills.
  const activeDays = dailyVehicles.filter((day) => day.vehicles > 0)
  const averagePerActiveDay =
    activeDays.length > 0 ? totalVehicles / activeDays.length : 0
  const busiestDay = activeDays.reduce<(typeof activeDays)[number] | null>(
    (busiest, day) => (busiest === null || day.vehicles > busiest.vehicles ? day : busiest),
    null
  )
  const quietestDay = activeDays.reduce<(typeof activeDays)[number] | null>(
    (quietest, day) => (quietest === null || day.vehicles < quietest.vehicles ? day : quietest),
    null
  )

  // ---- hour of day
  const hourlyRows = buildHourlyRows(hourlyVehicles)
  const vehiclesByHour = Array.from({ length: 24 }, (_, hour) =>
    sumOf(hourlyRows, (row) => row.values[hour])
  )
  const peakHour = vehiclesByHour.reduce(
    (best, count, hour) => (count > vehiclesByHour[best] ? hour : best),
    0
  )
  const hasHourlyData = vehiclesByHour[peakHour] > 0
  const heatmapRows = hourlyRows.map((row) => ({
    label: isAllStations ? getStationName(row.label) : row.label,
    values: row.values,
  }))

  const metrics: Metric[] = [
    {
      label: "Gas dispensed",
      value: formatInteger(totalKg),
      unit: "kg",
      change: hasComparison && (
        <ChangeBadge change={relativeChange(totalKg, previousKg)} unit="%" />
      ),
    },
    {
      label: "Vehicles per active day",
      value: formatInteger(averagePerActiveDay),
      note: `Across ${activeDays.length} days with fills`,
    },
    {
      label: "Busiest day",
      value: formatInteger(busiestDay?.vehicles ?? 0),
      note: busiestDay ? formatDate(busiestDay.day) : undefined,
    },
    {
      label: "Quietest day",
      value: formatInteger(quietestDay?.vehicles ?? 0),
      note: quietestDay ? formatDate(quietestDay.day) : "Days with fills only",
    },
    {
      label: "Busiest hour",
      value: hasHourlyData ? formatHour(peakHour) : "--",
      note: hasHourlyData
        ? `${formatInteger(vehiclesByHour[peakHour])} vehicles in that hour`
        : undefined,
    },
  ]

  const classItems = [
    { label: "Auto / small", rule: "up to 4 kg", key: "small" },
    { label: "Car", rule: "over 4 up to 12 kg", key: "car" },
    { label: "Bus / heavy", rule: "over 12 kg", key: "heavy" },
  ] as const

  // ---- ranking: stations when all are selected, otherwise dispensers
  const rankingRows: RankingRow[] =
    isAllStations && stationSummary
      ? stationSummary.map((row) => ({
          label: getStationName(row.station),
          value: row.vehicles,
          detail: `${formatInteger(row.kg)} kg · ${formatInteger(
            row.activeDays > 0 ? row.vehicles / row.activeDays : 0
          )} per active day`,
        }))
      : hourlyRows.map((row) => ({
          label: row.label,
          value: row.total,
          detail: `${formatInteger(percentOf(row.total, totalVehicles) ?? 0)}% of this station's vehicles`,
        }))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Daily vehicles served"
        stationLabel={stationLabel}
        range={range}
        note="A vehicle is one completed fill with gas dispensed. Repeated records of the same fill are counted once. Averages only use days that had fills."
      />

      <HeroPanel
        label="Vehicles served"
        value={formatInteger(totalVehicles)}
        change={
          hasComparison && (
            <ChangeBadge change={relativeChange(totalVehicles, previousVehicles)} unit="%" />
          )
        }
        chips={[
          `${formatInteger(totalKg)} kg dispensed`,
          `${formatInteger(averagePerActiveDay)} per active day`,
          `${activeDays.length} active days`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Vehicles per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <VehiclesTrendChart
          data={dailyVehicles.map((day, index) => ({
            day: day.day,
            vehicles: day.vehicles,
            previousVehicles: previousDailyVehicles?.[index]?.vehicles ?? null,
          }))}
          hasComparison={hasComparison}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      <VehicleClassCard
        items={classItems.map((item, index) => ({
          label: item.label,
          rule: item.rule,
          count: classCounts[item.key],
          color: VEHICLE_CLASS_COLORS[index],
          change: hasComparison && previousClassCounts && (
            <ChangeBadge
              change={relativeChange(classCounts[item.key], previousClassCounts[item.key])}
              unit="%"
            />
          ),
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Average by weekday"
          description="Average vehicles on days with fills"
        >
          <WeekdayChart data={buildWeekdayAverages(dailyVehicles)} />
        </DashboardPanel>

        <StationRankingCard
          title={isAllStations ? "Top stations" : "Dispensers"}
          description={
            isAllStations
              ? "Vehicles served in this period"
              : "Vehicles served by each dispenser"
          }
          valueLabel="vehicles"
          rows={rankingRows}
        />
      </div>

      <HourHeatmapCard rows={heatmapRows} />
    </div>
  )
}