import { Prisma } from "@/app/generated/prisma/client"
import type { DateBounds, DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// These read from the mv_dispenser_fills view (see db/002_dispenser_fills.sql).
// COUNT and SUM are cast in SQL because Prisma returns bigint/decimal as
// BigInt/Decimal objects, which cannot be sent to the browser as JSON.
// Callers must check the session first (requireSession) before using these.

type DailyVehiclesRow = { day: string; vehicles: number; kg: number }

type StationSummaryRow = {
  station: string
  vehicles: number
  kg: number
  activeDays: number
}

export async function getFillDateBounds(): Promise<DateBounds | null> {
  const [row] = await prisma.$queryRaw<
    { earliest: string | null; latest: string | null }[]
  >`
    SELECT
      to_char(MIN(ended_at)::date, 'YYYY-MM-DD') AS earliest,
      to_char(MAX(ended_at)::date, 'YYYY-MM-DD') AS latest
    FROM mv_dispenser_fills
  `

  return row?.earliest && row.latest
    ? { earliest: row.earliest, latest: row.latest }
    : null
}

// One row per calendar day in the range, including days with zero fills.
export async function getDailyVehicles(params: {
  station: StationFilter
  range: DateRange
}): Promise<DailyVehiclesRow[]> {
  const { station, range } = params
  const stationCondition =
    station === ALL_STATIONS
      ? Prisma.empty
      : Prisma.sql`AND station_name = ${station}`

  return prisma.$queryRaw<DailyVehiclesRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(${range.from}::date, ${range.to}::date, INTERVAL '1 day')::date AS day
    ),
    counts AS (
      SELECT
        ended_at::date AS day,
        COUNT(*)::int AS vehicles,
        SUM(quantity_kg)::float8 AS kg
      FROM mv_dispenser_fills
      WHERE ended_at >= ${range.from}::date
        AND ended_at < ${range.to}::date + 1
        ${stationCondition}
      GROUP BY 1
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS day,
      COALESCE(counts.vehicles, 0)::int AS vehicles,
      COALESCE(counts.kg, 0)::float8 AS kg
    FROM days
    LEFT JOIN counts USING (day)
    ORDER BY days.day
  `)
}

export async function getStationSummary(
  range: DateRange
): Promise<StationSummaryRow[]> {
  return prisma.$queryRaw<StationSummaryRow[]>`
    SELECT
      station_name AS station,
      COUNT(*)::int AS vehicles,
      COALESCE(SUM(quantity_kg), 0)::float8 AS kg,
      COUNT(DISTINCT ended_at::date)::int AS "activeDays"
    FROM mv_dispenser_fills
    WHERE ended_at >= ${range.from}::date
      AND ended_at < ${range.to}::date + 1
    GROUP BY station_name
    ORDER BY vehicles DESC
  `
}