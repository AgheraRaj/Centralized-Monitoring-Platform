import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Read-only: these only run SELECT queries on the mv_station_hours view
// (see db/003_station_hours.sql). Callers must check the session first.
// Hours on "closed" days (no activity at all) are left out of every count.

type DailyUptimeRow = { day: string; upHours: number; openHours: number }

type StationUptimeRow = {
  station: string
  upHours: number
  openHours: number
  closedDays: number
  hasCompressorSignal: boolean
  hasFlowSignal: boolean
}

function rangeCondition(range: DateRange) {
  return Prisma.sql`hour_start >= ${range.from}::date AND hour_start < ${range.to}::date + 1`
}

function stationCondition(station: StationFilter) {
  return station === ALL_STATIONS
    ? Prisma.empty
    : Prisma.sql`AND station_name = ${station}`
}

// One row per calendar day. Days with no open hours come back as zeros.
export async function getDailyUptime(params: {
  station: StationFilter
  range: DateRange
}): Promise<DailyUptimeRow[]> {
  const { station, range } = params

  return prisma.$queryRaw<DailyUptimeRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(${range.from}::date, ${range.to}::date, INTERVAL '1 day')::date AS day
    ),
    daily AS (
      SELECT
        hour_start::date AS day,
        COUNT(*) FILTER (WHERE is_up)::int AS up_hours,
        COUNT(*)::int AS open_hours
      FROM mv_station_hours
      WHERE ${rangeCondition(range)}
        AND is_open_day
        ${stationCondition(station)}
      GROUP BY 1
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS day,
      COALESCE(daily.up_hours, 0)::int AS "upHours",
      COALESCE(daily.open_hours, 0)::int AS "openHours"
    FROM days
    LEFT JOIN daily USING (day)
    ORDER BY days.day
  `)
}

export async function getStationUptime(params: {
  station: StationFilter
  range: DateRange
}): Promise<StationUptimeRow[]> {
  const { station, range } = params

  return prisma.$queryRaw<StationUptimeRow[]>(Prisma.sql`
    SELECT
      station_name AS station,
      COUNT(*) FILTER (WHERE is_open_day AND is_up)::int AS "upHours",
      COUNT(*) FILTER (WHERE is_open_day)::int AS "openHours",
      COUNT(DISTINCT hour_start::date) FILTER (WHERE NOT is_open_day)::int AS "closedDays",
      bool_or(has_compressor_signal) AS "hasCompressorSignal",
      bool_or(has_flow_signal) AS "hasFlowSignal"
    FROM mv_station_hours
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
    GROUP BY 1
    ORDER BY 1
  `)
}