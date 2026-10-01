import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Read-only: these only run SELECT queries on the mv_power_outages view
// (see db/004_power_outages.sql). Callers must check the session first.
// Outages are estimated from supply voltage; there is no power event log.

type OutageSummaryRow = {
  outages: number
  totalMinutes: number
  longestMinutes: number
  fillsDuring: number
}

type DailyOutageRow = { day: string; minutes: number; outages: number }

type OutageEventRow = {
  station: string
  startedAt: string
  durationMinutes: number
  fillsDuring: number
  lowestVolts: number
}

function rangeCondition(range: DateRange) {
  return Prisma.sql`started_at >= ${range.from}::date AND started_at < ${range.to}::date + 1`
}

function stationCondition(station: StationFilter) {
  return station === ALL_STATIONS
    ? Prisma.empty
    : Prisma.sql`AND station_name = ${station}`
}

export async function getOutageSummary(params: {
  station: StationFilter
  range: DateRange
}): Promise<OutageSummaryRow> {
  const { station, range } = params

  const [row] = await prisma.$queryRaw<OutageSummaryRow[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS outages,
      COALESCE(SUM(duration_minutes), 0)::int AS "totalMinutes",
      COALESCE(MAX(duration_minutes), 0)::int AS "longestMinutes",
      COALESCE(SUM(fills_during), 0)::int AS "fillsDuring"
    FROM mv_power_outages
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
  `)

  return row
}

// One row per calendar day, including days with no outage.
export async function getDailyOutages(params: {
  station: StationFilter
  range: DateRange
}): Promise<DailyOutageRow[]> {
  const { station, range } = params

  return prisma.$queryRaw<DailyOutageRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(${range.from}::date, ${range.to}::date, INTERVAL '1 day')::date AS day
    ),
    daily AS (
      SELECT
        started_at::date AS day,
        SUM(duration_minutes)::int AS minutes,
        COUNT(*)::int AS outages
      FROM mv_power_outages
      WHERE ${rangeCondition(range)}
        ${stationCondition(station)}
      GROUP BY 1
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS day,
      COALESCE(daily.minutes, 0)::int AS minutes,
      COALESCE(daily.outages, 0)::int AS outages
    FROM days
    LEFT JOIN daily USING (day)
    ORDER BY days.day
  `)
}

// Timestamps are formatted in SQL so no time zone conversion can shift them.
export async function getLatestOutages(params: {
  station: StationFilter
  range: DateRange
}): Promise<OutageEventRow[]> {
  const { station, range } = params

  return prisma.$queryRaw<OutageEventRow[]>(Prisma.sql`
    SELECT
      station_name AS station,
      to_char(started_at, 'DD Mon YYYY, HH24:MI') AS "startedAt",
      duration_minutes AS "durationMinutes",
      fills_during AS "fillsDuring",
      ROUND(lowest_volts, 0)::int AS "lowestVolts"
    FROM mv_power_outages
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
    ORDER BY started_at DESC
    LIMIT 50
  `)
}