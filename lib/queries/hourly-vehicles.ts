import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import {
  rangeCondition,
  stationCondition,
} from "@/lib/queries/fill-conditions"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// READ-ONLY: runs a SELECT on the existing mv_dispenser_fills view.
// Callers must check the session first (requireSession).

type HourlyVehicleRow = { label: string; hour: number; vehicles: number }

// Vehicles per hour of the day (0 to 23). Grouped by station when all stations
// are selected, otherwise by dispenser.
export async function getHourlyVehicles(params: {
  station: StationFilter
  range: DateRange
}): Promise<HourlyVehicleRow[]> {
  const { station, range } = params
  const labelColumn =
    station === ALL_STATIONS
      ? Prisma.sql`station_name`
      : Prisma.sql`COALESCE(serial_number, 'Unknown')`

  return prisma.$queryRaw<HourlyVehicleRow[]>(Prisma.sql`
    SELECT
      ${labelColumn} AS label,
      EXTRACT(HOUR FROM ended_at)::int AS hour,
      COUNT(*)::int AS vehicles
    FROM mv_dispenser_fills
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
    GROUP BY 1, 2
  `)
}