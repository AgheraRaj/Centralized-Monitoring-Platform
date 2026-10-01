import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Read-only: runs a SELECT on the mv_dispenser_fills view (see db/002_dispenser_fills.sql).
// Callers must check the session first (requireSession).

type DispenserSummaryRow = {
  station: string
  dispensers: number
  vehicles: number
  kg: number
  activeDays: number
}

// A dispenser is counted when it had at least one fill in the period,
// so a dispenser that sat completely idle is not counted.
export async function getDispenserSummary(params: {
  station: StationFilter
  range: DateRange
}): Promise<DispenserSummaryRow[]> {
  const { station, range } = params
  const stationCondition =
    station === ALL_STATIONS
      ? Prisma.empty
      : Prisma.sql`AND station_name = ${station}`

  return prisma.$queryRaw<DispenserSummaryRow[]>(Prisma.sql`
    SELECT
      station_name AS station,
      COUNT(DISTINCT serial_number)::int AS dispensers,
      COUNT(*)::int AS vehicles,
      COALESCE(SUM(quantity_kg), 0)::float8 AS kg,
      COUNT(DISTINCT ended_at::date)::int AS "activeDays"
    FROM mv_dispenser_fills
    WHERE ended_at >= ${range.from}::date
      AND ended_at < ${range.to}::date + 1
      ${stationCondition}
    GROUP BY station_name
    ORDER BY station_name
  `)
}