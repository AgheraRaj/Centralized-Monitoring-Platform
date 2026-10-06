import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import {
  rangeCondition,
  stationCondition,
} from "@/lib/queries/fill-conditions"
import { prisma } from "@/lib/prisma"
import type { StationFilter } from "@/lib/stations"

// READ-ONLY: runs a SELECT on the existing mv_dispenser_fills view.
// Callers must check the session first (requireSession).

type DispenserKgRow = { dispenser: string; kg: number }

// Gas sold by each dispenser (by serial number), in kg.
export async function getDispenserKg(params: {
  station: StationFilter
  range: DateRange
}): Promise<DispenserKgRow[]> {
  const { station, range } = params

  return prisma.$queryRaw<DispenserKgRow[]>(Prisma.sql`
    SELECT
      COALESCE(serial_number, 'Unknown') AS dispenser,
      COALESCE(SUM(quantity_kg), 0)::float8 AS kg
    FROM mv_dispenser_fills
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
    GROUP BY 1
  `)
}