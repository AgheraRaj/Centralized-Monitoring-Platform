import {
  resolveDateRange,
  resolveRangePreset,
  type DateRange,
} from "@/lib/date-range"
import { getFillDateBounds } from "@/lib/queries/vehicles"
import { resolveStationFilter, type StationFilter } from "@/lib/stations"

export type DashboardFilters = {
  station: StationFilter
  range: DateRange
}

// Turns the ?station= and ?range= URL params into safe, resolved filters.
// Returns null when there is no fill data at all.
export async function getDashboardFilters(searchParams: {
  station?: string
  range?: string
}): Promise<DashboardFilters | null> {
  const bounds = await getFillDateBounds()
  if (!bounds) return null

  return {
    station: resolveStationFilter(searchParams.station),
    range: resolveDateRange(resolveRangePreset(searchParams.range), bounds),
  }
}