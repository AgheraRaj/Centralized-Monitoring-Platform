import type { DateRange } from "@/lib/date-range"
import { getCompressorDailyRuns } from "@/lib/queries/compressors"
import { getDispenserKg } from "@/lib/queries/dispenser-kg"
import { getDispenserSummary } from "@/lib/queries/dispensers"
import {
  getDailyFullFill,
  getFullFillBreakdown,
  getFullFillByVehicleClass,
  getUnmeasuredFillCount,
} from "@/lib/queries/full-fill"
import { getGasDryOutEvents, getGasMonitoredStations } from "@/lib/queries/gas-outages"
import { getHourlyVehicles } from "@/lib/queries/hourly-vehicles"
import { getLatestOutages, getOutageSummary } from "@/lib/queries/power-outages"
import { getStationUptime } from "@/lib/queries/uptime"
import { getDailyVehicles, getStationSummary } from "@/lib/queries/vehicles"
import {
  ALL_STATIONS,
  POWER_MONITORED_STATIONS,
  type StationFilter,
} from "@/lib/stations"

// Every section loads on its own: if one query fails (for example its view has
// not been created yet), that section is null and the rest of the page still works.
async function settle<T>(name: string, promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    console.error(`[overview] ${name} failed`, error)
    return null
  }
}

const skip = Promise.resolve(null)

export async function loadOverviewData(params: {
  station: StationFilter
  range: DateRange
  previousRange: DateRange | null
}) {
  const { station, range, previousRange } = params
  const current = { station, range }
  const previous = previousRange ? { station, range: previousRange } : null
  const hasPowerData =
    station === ALL_STATIONS || POWER_MONITORED_STATIONS.includes(station)

  const [
    dailyVehicles,
    previousDailyVehicles,
    dailyFullFill,
    previousDailyFullFill,
    vehicleClassFills,
    unmeasuredFills,
    stationUptime,
    previousStationUptime,
    outageSummary,
    previousOutageSummary,
    latestOutages,
    stationSummary,
    dispenserBreakdown,
    dispenserSummary,
    hourlyVehicles,
    gasMonitoredStations,
    gasEvents,
    previousGasEvents,
    compressorRuns,
    previousCompressorRuns,
    dispenserKg,
  ] = await Promise.all([
    settle("daily vehicles", getDailyVehicles(current)),
    settle("previous daily vehicles", previous ? getDailyVehicles(previous) : skip),
    settle("daily full-fill", getDailyFullFill(current)),
    settle("previous daily full-fill", previous ? getDailyFullFill(previous) : skip),
    settle("full-fill by vehicle class", getFullFillByVehicleClass(current)),
    settle("unmeasured fills", getUnmeasuredFillCount(current)),
    settle("station uptime", getStationUptime(current)),
    settle("previous station uptime", previous ? getStationUptime(previous) : skip),
    settle("outage summary", hasPowerData ? getOutageSummary(current) : skip),
    settle(
      "previous outage summary",
      hasPowerData && previous ? getOutageSummary(previous) : skip
    ),
    settle("latest outages", hasPowerData ? getLatestOutages(current) : skip),
    settle("station summary", station === ALL_STATIONS ? getStationSummary(range) : skip),
    settle("dispenser breakdown", station === ALL_STATIONS ? skip : getFullFillBreakdown(current)),
    settle("dispenser summary", getDispenserSummary(current)),
    settle("hourly vehicles", getHourlyVehicles(current)),
    // Gas dry-outs: only stations with gas pressure readings can be judged.
    settle("gas monitored stations", getGasMonitoredStations()),
    settle("gas dry-outs", getGasDryOutEvents(current)),
    settle("previous gas dry-outs", previous ? getGasDryOutEvents(previous) : skip),
    // Compressor runs are read for every station and narrowed to the selection on the page.
    settle("compressor runs", getCompressorDailyRuns(range)),
    settle("previous compressor runs", previousRange ? getCompressorDailyRuns(previousRange) : skip),
    // Gas sold per dispenser, for ranking dispensers by sales.
    settle("dispenser kg", station === ALL_STATIONS ? skip : getDispenserKg(current)),
  ])

  return {
    hasPowerData,
    dailyVehicles,
    previousDailyVehicles,
    dailyFullFill,
    previousDailyFullFill,
    vehicleClassFills,
    unmeasuredFills,
    stationUptime,
    previousStationUptime,
    outageSummary,
    previousOutageSummary,
    latestOutages,
    stationSummary,
    dispenserBreakdown,
    dispenserSummary,
    hourlyVehicles,
    gasMonitoredStations,
    gasEvents,
    previousGasEvents,
    compressorRuns,
    previousCompressorRuns,
    dispenserKg,
  }
}

export type OverviewData = Awaited<ReturnType<typeof loadOverviewData>>