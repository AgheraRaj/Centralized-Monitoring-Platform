import { DashboardPanel } from "@/components/dashboard-panel"
import { ChangeBadge } from "@/components/overview/change-badge"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import { SortableTable, type SortableRow } from "@/components/sortable-table"
import { HeroPanel } from "@/components/vehicles/hero-panel"
import { PageHeader } from "@/components/vehicles/page-header"
import { RateTrendChart } from "@/components/vehicles/rate-trend-chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import {
  getCapacityKgPerHour,
  getRatedCapacityKgPerDay,
} from "@/lib/dispenser-capacity"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import {
  getComparisonRange,
  pointChange,
  relativeChange,
  sumOf,
} from "@/lib/overview"
import { getDispenserSummary } from "@/lib/queries/dispensers"
import { getDailyVehicles, getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type CapacityPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

type DayKg = { vehicles: number; kg: number }

function utilizationPercent(soldKg: number, ratedKg: number) {
  return ratedKg > 0 ? (soldKg / ratedKg) * 100 : null
}

function roundToOneDecimal(value: number | null) {
  return value === null ? null : Number(value.toFixed(1))
}

// Average daily kg over days that had fills, so closed days do not drag it down.
function averageActiveKg(days: DayKg[]) {
  const active = days.filter((day) => day.vehicles > 0)
  return active.length > 0 ? sumOf(active, (day) => day.kg) / active.length : 0
}

export default async function CapacityPage({ searchParams }: CapacityPageProps) {
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
  const stationLabel =
    station === ALL_STATIONS ? "All stations" : getStationName(station)

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const hasComparison = previousRange !== null

  const [summary, dailyVehicles, previousDailyVehicles] = await Promise.all([
    getDispenserSummary({ station, range }),
    getDailyVehicles({ station, range }),
    previousRange
      ? getDailyVehicles({ station, range: previousRange })
      : Promise.resolve(null),
  ])

  const stationRows = summary.map((row) => {
    const ratedKgPerDay = getRatedCapacityKgPerDay(row.station, row.dispensers)
    const averageDailyKg = row.activeDays > 0 ? row.kg / row.activeDays : 0
    return {
      ...row,
      capacityKgPerHour: getCapacityKgPerHour(row.station),
      ratedKgPerDay,
      averageDailyKg,
      utilization: utilizationPercent(averageDailyKg, ratedKgPerDay),
    }
  })

  const totalDispensers = sumOf(stationRows, (row) => row.dispensers)
  const totalRatedKgPerDay = sumOf(stationRows, (row) => row.ratedKgPerDay)

  const averageDailyKg = averageActiveKg(dailyVehicles)
  const previousAverageDailyKg = previousDailyVehicles
    ? averageActiveKg(previousDailyVehicles)
    : null
  const utilization = utilizationPercent(averageDailyKg, totalRatedKgPerDay)
  const previousUtilization =
    previousAverageDailyKg === null
      ? null
      : utilizationPercent(previousAverageDailyKg, totalRatedKgPerDay)

  const dayUtilization = (day: DayKg) =>
    day.vehicles > 0 ? utilizationPercent(day.kg, totalRatedKgPerDay) : null

  const chartData = dailyVehicles.map((day, index) => {
    const previousDay = previousDailyVehicles?.[index]
    return {
      day: day.day,
      value: roundToOneDecimal(dayUtilization(day)),
      previousValue: previousDay ? roundToOneDecimal(dayUtilization(previousDay)) : null,
    }
  })
  const chartMax = Math.max(
    100,
    Math.ceil(
      Math.max(0, ...chartData.flatMap((point) => [point.value ?? 0, point.previousValue ?? 0]))
    )
  )

  const activeDayRates = dailyVehicles
    .filter((day) => day.vehicles > 0)
    .map((day) => ({ day: day.day, rate: dayUtilization(day) }))
    .filter((item): item is { day: string; rate: number } => item.rate !== null)
  const peakDay = activeDayRates.reduce<(typeof activeDayRates)[number] | null>(
    (top, item) => (top === null || item.rate > top.rate ? item : top),
    null
  )
  const lowestDay = activeDayRates.reduce<(typeof activeDayRates)[number] | null>(
    (bottom, item) => (bottom === null || item.rate < bottom.rate ? item : bottom),
    null
  )

  const tableRows: SortableRow[] = stationRows.map((row) => ({
    id: row.station,
    cells: {
      station: { text: getStationName(row.station), sort: getStationName(row.station) },
      utilization: {
        text: row.utilization === null ? "--" : formatPercent(row.utilization),
        sort: row.utilization ?? -1,
        percent: row.utilization ?? 0,
        color: CHART_COLORS.primary,
      },
      dispensers: { text: formatInteger(row.dispensers), sort: row.dispensers },
      capacityPerHour: {
        text: formatInteger(row.capacityKgPerHour),
        sort: row.capacityKgPerHour,
      },
      ratedPerDay: { text: formatInteger(row.ratedKgPerDay), sort: row.ratedKgPerDay },
      averageSales: {
        text: formatInteger(row.averageDailyKg),
        sort: row.averageDailyKg,
      },
    },
  }))

  const metrics: Metric[] = [
    {
      label: "Dispensers",
      value: formatInteger(totalDispensers),
      note: "With at least one fill in this period",
    },
    {
      label: "Rated capacity per day",
      value: formatInteger(totalRatedKgPerDay),
      unit: "kg",
    },
    {
      label: "Average daily sales",
      value: formatInteger(averageDailyKg),
      unit: "kg",
      change: hasComparison && (
        <ChangeBadge
          change={relativeChange(averageDailyKg, previousAverageDailyKg)}
          unit="%"
        />
      ),
    },
    {
      label: "Peak day",
      value: peakDay ? formatPercent(peakDay.rate) : "--",
      note: peakDay ? formatDate(peakDay.day) : undefined,
    },
    {
      label: "Lowest active day",
      value: lowestDay ? formatPercent(lowestDay.rate) : "--",
      note: lowestDay ? formatDate(lowestDay.day) : "Days with fills only",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dispenser utilization"
        stationLabel={stationLabel}
        range={range}
        note="Rated capacity = dispensers × kg per hour × 24 hours. Utilization is the average daily gas sold divided by that capacity. Only days with fills are averaged."
      />

      <HeroPanel
        label="Utilization"
        value={utilization === null ? "--" : formatPercent(utilization)}
        change={
          hasComparison && (
            <ChangeBadge change={pointChange(utilization, previousUtilization)} unit="pp" />
          )
        }
        chips={[
          `${formatInteger(averageDailyKg)} kg sold per day`,
          `${formatInteger(totalRatedKgPerDay)} kg rated per day`,
          `${formatInteger(totalDispensers)} dispensers`,
        ]}
        footer={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`}
        chartTitle="Utilization per day"
        chartDescription={
          hasComparison
            ? "This period against the period before it"
            : "No earlier period to compare with"
        }
      >
        <RateTrendChart
          data={chartData}
          label="Utilization"
          hasComparison={hasComparison}
          maxPercent={chartMax}
        />
      </HeroPanel>

      <KpiStrip metrics={metrics} />

      <DashboardPanel
        title={station === ALL_STATIONS ? "By station" : "Station detail"}
        description="Bar shows average daily sales as a share of rated capacity. Click a column heading to sort."
      >
        <SortableTable
          columns={[
            { key: "station", label: "Station", align: "left" },
            { key: "utilization", label: "Utilization" },
            { key: "dispensers", label: "Dispensers" },
            { key: "capacityPerHour", label: "Rated kg/hr each" },
            { key: "ratedPerDay", label: "Rated kg/day" },
            { key: "averageSales", label: "Avg daily sales (kg)" },
          ]}
          rows={tableRows}
        />
      </DashboardPanel>
    </div>
  )
}