import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { STATION_DOWN_MAX_PRESSURE_BAR } from "@/lib/uptime-status"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Read-only: these only run SELECT queries on the mv_station_hours view
// (see db/003_station_hours.sql). Callers must check the session first.
// Hours on "closed" days (no activity at all) are left out of every count.
// Nothing here writes to the database. getStationDownHours also reads the
// priority_pressure column of the compressor tables, read-only.

type DailyUptimeRow = { day: string; upHours: number; openHours: number }

type StationUptimeRow = {
  station: string
  upHours: number
  openHours: number
  closedDays: number
  // Hours on closed days. Counted from the hourly view, so no 24-hour guess.
  closedHours: number
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
      COUNT(*) FILTER (WHERE NOT is_open_day)::int AS "closedHours",
      bool_or(has_compressor_signal) AS "hasCompressorSignal",
      bool_or(has_flow_signal) AS "hasFlowSignal"
    FROM mv_station_hours
    WHERE ${rangeCondition(range)}
      ${stationCondition(station)}
    GROUP BY 1
    ORDER BY 1
  `)
}

type StationDownHoursRow = { station: string; downHours: number }

// Open hours that are not up AND have a low priority pressure, per station.
//
// An hour that is not up already has no fill, no compressor running-hour increase
// and no gas flow. If the average priority pressure in that hour is
// STATION_DOWN_MAX_PRESSURE_BAR or lower, it is DOWN. Every other not-up hour is IDLE
// (pressure above the limit, or no pressure reading at all), so the page works
// idle out as: not-up hours minus down hours.
//
// Each compressor table is listed one by one because the tables are separate.
// A new compressor table needs one more UNION ALL line. Dates use [0-9] instead of \d
// so the pattern survives the JS template string.
export async function getStationDownHours(params: {
  station: StationFilter
  range: DateRange
}): Promise<StationDownHoursRow[]> {
  const { station, range } = params
  const hoursStationCondition =
    station === ALL_STATIONS
      ? Prisma.empty
      : Prisma.sql`AND hours.station_name = ${station}`

  return prisma.$queryRaw<StationDownHoursRow[]>(Prisma.sql`
    WITH pressure_source AS (
      SELECT station_name, date_time, priority_pressure FROM bukt_compressor_readings
      UNION ALL
      SELECT station_name, date_time, priority_pressure FROM chhatrashal_kpcl_compressor_readings
      UNION ALL
      SELECT station_name, date_time, priority_pressure FROM delta_compressor_readings
      UNION ALL
      SELECT station_name, date_time, priority_pressure FROM icl_compressor_readings
      UNION ALL
      SELECT station_name, date_time, priority_pressure FROM sgtn2_kpcl_compressor_readings
      UNION ALL
      SELECT station_name, date_time, priority_pressure FROM tulip_compressor_readings
    ),
    pressure_parsed AS (
      -- Every source column is text, so each value is checked before it is cast.
      SELECT
        station_name,
        CASE WHEN date_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
             THEN date_time::timestamp END AS read_at,
        CASE WHEN priority_pressure ~ '^[0-9]+(\\.[0-9]+)?$'
             THEN priority_pressure::numeric END AS pressure_bar
      FROM pressure_source
      WHERE station_name IS NOT NULL
        AND date_time >= ${range.from}
        AND date_time < (${range.to}::date + 1)::text
        ${stationCondition(station)}
    ),
    hourly_pressure AS (
      SELECT
        station_name,
        date_trunc('hour', read_at) AS hour_start,
        AVG(pressure_bar) AS average_bar
      FROM pressure_parsed
      WHERE read_at IS NOT NULL AND pressure_bar IS NOT NULL
      GROUP BY 1, 2
    )
    SELECT
      hours.station_name AS station,
      COUNT(*) FILTER (
        WHERE pressure.average_bar <= ${STATION_DOWN_MAX_PRESSURE_BAR}::numeric
      )::int AS "downHours"
    FROM mv_station_hours AS hours
    LEFT JOIN hourly_pressure AS pressure
      ON pressure.station_name = hours.station_name
     AND pressure.hour_start = hours.hour_start
    WHERE hours.hour_start >= ${range.from}::date
      AND hours.hour_start < ${range.to}::date + 1
      AND hours.is_open_day
      AND NOT hours.is_up
      ${hoursStationCondition}
    GROUP BY hours.station_name
    ORDER BY hours.station_name
  `)
}