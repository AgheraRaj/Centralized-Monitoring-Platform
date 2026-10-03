import { DashboardPanel } from "@/components/dashboard-panel"
import { VehicleClassChart } from "@/components/full-fill/vehicle-class-chart"
import { AttentionCard } from "@/components/overview/attention-card"
import { ChangeBadge } from "@/components/overview/change-badge"
import { FillQualityCard } from "@/components/overview/fill-quality-card"
import { HeroCard } from "@/components/overview/hero-card"
import { HourHeatmapCard } from "@/components/overview/hour-heatmap-card"
import { KpiStrip, type Metric } from "@/components/overview/kpi-strip"
import {
  StationRankingCard,
  type RankingRow,
} from "@/components/overview/station-ranking-card"
import { UnavailableNote } from "@/components/overview/unavailable-note"
import { UtilizationGaugeCard } from "@/components/overview/utilization-gauge-card"
import { RangeSelector } from "@/components/range-selector"
import { getDashboardFilters } from "@/lib/dashboard-filters"
import { resolveRangePreset } from "@/lib/date-range"
import { getRatedCapacityKgPerDay } from "@/lib/dispenser-capacity"
import { formatDate, formatInteger, formatPercent } from "@/lib/format"
import { formatDuration } from "@/lib/format-duration"
import { describeVehicleClassRanges } from "@/lib/full-fill"
import { loadOverviewData } from "@/lib/overview-data"
import {
  buildHourlyRows,
  getComparisonRange,
  percentOf,
  pointChange,
  relativeChange,
  sumOf,
} from "@/lib/overview"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { requireSession } from "@/lib/session"
import { ALL_STATIONS, getStationName } from "@/lib/stations"

type DashboardPageProps = {
  searchParams: Promise<{ station?: string; range?: string }>
}

function show(value: number | null, format: (value: number) => string) {
  return value === null ? "--" : format(value)
}

function uptimeOf(rows: { upHours: number; openHours: number }[] | null) {
  if (!rows) return null
  return percentOf(sumOf(rows, (row) => row.upHours), sumOf(rows, (row) => row.openHours))
}

function fullFillRateOf(rows: { fullFills: number; belowFills: number }[] | null) {
  if (!rows) return null
  const fullFills = sumOf(rows, (row) => row.fullFills)
  return percentOf(fullFills, fullFills + sumOf(rows, (row) => row.belowFills))
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireSession()

  const params = await searchParams
  const filters = await getDashboardFilters(params)
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
  const stationLabel = isAllStations ? "All stations" : getStationName(station)

  const bounds = await getFillDateBounds()
  const previousRange = bounds ? getComparisonRange(range, bounds.earliest) : null
  const data = await loadOverviewData({ station, range, previousRange })
  const hasComparison = previousRange !== null

  // Links to the detail pages keep the selected station and date range.
  const query = new URLSearchParams({
    station,
    range: resolveRangePreset(params.range),
  }).toString()
  const link = (path: string) => `${path}?${query}`

  // ---- vehicles and gas
  const { dailyVehicles } = data
  const totalVehicles = dailyVehicles ? sumOf(dailyVehicles, (day) => day.vehicles) : null
  const previousVehicles = data.previousDailyVehicles
    ? sumOf(data.previousDailyVehicles, (day) => day.vehicles)
    : null
  const totalKg = dailyVehicles ? sumOf(dailyVehicles, (day) => day.kg) : null
  const previousKg = data.previousDailyVehicles
    ? sumOf(data.previousDailyVehicles, (day) => day.kg)
    : null
  const activeDays = dailyVehicles?.filter((day) => day.vehicles > 0) ?? []
  const averagePerActiveDay =
    totalVehicles !== null && activeDays.length > 0 ? totalVehicles / activeDays.length : 0
  const averageDailyKg =
    activeDays.length > 0 ? sumOf(activeDays, (day) => day.kg) / activeDays.length : 0
  const peakDay = activeDays.reduce<{ day: string; kg: number } | null>(
    (peak, day) => (peak === null || day.kg > peak.kg ? { day: day.day, kg: day.kg } : peak),
    null
  )

  // ---- quality, uptime, outages, capacity
  const fullFillRate = fullFillRateOf(data.dailyFullFill)
  const previousFullFillRate = fullFillRateOf(data.previousDailyFullFill)
  const uptime = uptimeOf(data.stationUptime)
  const previousUptime = uptimeOf(data.previousStationUptime)
  const outageMinutes = data.outageSummary ? data.outageSummary.totalMinutes : null
  const previousOutageMinutes = data.previousOutageSummary
    ? data.previousOutageSummary.totalMinutes
    : null

  const dispenserRows = data.dispenserSummary ?? []
  const ratedKgPerDay = sumOf(dispenserRows, (row) =>
    getRatedCapacityKgPerDay(row.station, row.dispensers)
  )
  const dispenserCount = sumOf(dispenserRows, (row) => row.dispensers)
  const utilization =
    data.dispenserSummary && ratedKgPerDay > 0 ? (averageDailyKg / ratedKgPerDay) * 100 : null

  // ---- KPI strip
  const metrics: Metric[] = [
    {
      label: "Gas dispensed",
      value: show(totalKg, formatInteger),
      unit: "kg",
      change: hasComparison && (
        <ChangeBadge change={relativeChange(totalKg, previousKg)} unit="%" />
      ),
    },
    {
      label: "Vehicles per active day",
      value: show(totalVehicles === null ? null : averagePerActiveDay, formatInteger),
      note: `Across ${activeDays.length} days with fills`,
    },
    {
      label: "Full-fill rate",
      value: show(fullFillRate, formatPercent),
      change: hasComparison && (
        <ChangeBadge change={pointChange(fullFillRate, previousFullFillRate)} unit="pp" />
      ),
      note: "Fills ending at or above 200 bar",
    },
    {
      label: "Station uptime",
      value: show(uptime, formatPercent),
      change: hasComparison && (
        <ChangeBadge change={pointChange(uptime, previousUptime)} unit="pp" />
      ),
      note: "Up hours of open hours",
    },
    {
      label: "Power outage downtime",
      value: data.hasPowerData ? show(outageMinutes, formatDuration) : "--",
      change:
        hasComparison && data.hasPowerData ? (
          <ChangeBadge
            change={relativeChange(outageMinutes, previousOutageMinutes)}
            unit="%"
            goodWhen="down"
          />
        ) : undefined,
      note: !data.hasPowerData
        ? "No voltage data for this station"
        : isAllStations
          ? "Stations with voltage data only"
          : undefined,
      badge:
        data.outageSummary !== null && data.hasPowerData
          ? { text: `${formatInteger(data.outageSummary.outages)} estimated outages`, tone: "neutral" }
          : undefined,
    },
    {
      label: "Dispenser utilization",
      value: show(utilization, formatPercent),
      note: `${formatInteger(dispenserCount)} dispensers counted`,
    },
  ]

  // ---- ranking: stations when all are selected, otherwise dispensers
  const uptimeByStation = new Map(
    (data.stationUptime ?? []).map((row) => [
      row.station,
      percentOf(row.upHours, row.openHours),
    ])
  )
  const rankingRows: RankingRow[] = isAllStations
    ? (data.stationSummary ?? [])
        .map((row) => ({
          label: getStationName(row.station),
          value: row.vehicles,
          detail: `${formatInteger(row.kg)} kg · ${formatInteger(
            row.activeDays > 0 ? row.vehicles / row.activeDays : 0
          )} per active day`,
          uptime: uptimeByStation.get(row.station) ?? null,
        }))
        .sort((a, b) => b.value - a.value)
    : (data.dispenserBreakdown ?? []).map((row) => ({
        label: row.label,
        value: row.fills,
        detail: `Full-fill rate ${formatPercent(percentOf(row.fullFills, row.fills) ?? 0)}`,
      }))
  const rankingAvailable = isAllStations ? data.stationSummary !== null : data.dispenserBreakdown !== null

  const lowestUptime = [...uptimeByStation.entries()]
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([stationCode, value]) => ({ station: stationCode, uptime: value }))
    .sort((a, b) => a.uptime - b.uptime)

  const heatmapRows = buildHourlyRows(data.hourlyVehicles ?? []).map((row) => ({
    label: isAllStations ? getStationName(row.label) : row.label,
    values: row.values,
  }))

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

      {dailyVehicles && totalVehicles !== null && totalKg !== null ? (
        <HeroCard
          stationLabel={stationLabel}
          range={range}
          totalVehicles={totalVehicles}
          vehiclesChange={relativeChange(totalVehicles, previousVehicles)}
          totalKg={totalKg}
          fullFillRate={fullFillRate}
          averagePerActiveDay={averagePerActiveDay}
          hasComparison={hasComparison}
          chartData={dailyVehicles.map((day, index) => ({
            day: day.day,
            vehicles: day.vehicles,
            previousVehicles: data.previousDailyVehicles?.[index]?.vehicles ?? null,
          }))}
        />
      ) : (
        <DashboardPanel title="Vehicles served">
          <UnavailableNote />
        </DashboardPanel>
      )}

      <KpiStrip metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {data.dailyFullFill ? (
            <FillQualityCard
              fullFills={sumOf(data.dailyFullFill, (day) => day.fullFills)}
              belowFills={sumOf(data.dailyFullFill, (day) => day.belowFills)}
              unmeasuredFills={data.unmeasuredFills}
              href={link("/full-fill")}
            />
          ) : (
            <DashboardPanel title="Fill quality">
              <UnavailableNote />
            </DashboardPanel>
          )}
        </div>

        <UtilizationGaugeCard
          utilization={utilization}
          ratedKgPerDay={ratedKgPerDay}
          averageDailyKg={averageDailyKg}
          dispensers={dispenserCount}
          peakDay={peakDay}
          href={link("/capacity")}
        />

        <div className="xl:col-span-2">
          <DashboardPanel
            title="Fills by vehicle class"
            description={`Estimated from fill size, not recorded by the dispenser. ${describeVehicleClassRanges().join(" · ")}.`}
            href={link("/full-fill")}
            linkLabel="Full-fill rate"
          >
            {data.vehicleClassFills ? (
              <VehicleClassChart data={data.vehicleClassFills} />
            ) : (
              <UnavailableNote />
            )}
          </DashboardPanel>
        </div>

        <AttentionCard
          hasPowerData={data.hasPowerData}
          outageSummary={data.outageSummary}
          latestOutages={data.latestOutages ?? []}
          lowestUptime={lowestUptime}
          href={link("/power")}
        />

        {rankingAvailable ? (
          <StationRankingCard
            title={isAllStations ? "Top stations" : "Dispensers"}
            description={
              isAllStations
                ? "Vehicles served, with uptime"
                : "Fills with a valid end pressure"
            }
            valueLabel={isAllStations ? "vehicles" : "fills"}
            rows={rankingRows}
            href={link(isAllStations ? "/vehicles" : "/full-fill")}
            linkLabel={isAllStations ? "Daily vehicles" : "Full-fill rate"}
          />
        ) : (
          <DashboardPanel title={isAllStations ? "Top stations" : "Dispensers"}>
            <UnavailableNote />
          </DashboardPanel>
        )}

        <div className="xl:col-span-2">
          {data.hourlyVehicles ? (
            <HourHeatmapCard rows={heatmapRows} href={link("/vehicles")} />
          ) : (
            <DashboardPanel title="Vehicles by hour of day">
              <UnavailableNote />
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  )
}