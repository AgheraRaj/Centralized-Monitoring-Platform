import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Shared WHERE fragments for queries on the mv_dispenser_fills view.

export function rangeCondition(range: DateRange) {
  return Prisma.sql`ended_at >= ${range.from}::date AND ended_at < ${range.to}::date + 1`
}

export function stationCondition(station: StationFilter) {
  return station === ALL_STATIONS
    ? Prisma.empty
    : Prisma.sql`AND station_name = ${station}`
}