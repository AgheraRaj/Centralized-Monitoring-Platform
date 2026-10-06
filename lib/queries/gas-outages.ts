import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import {
  GAS_DRY_OUT_MAX_GAP_MINUTES,
  GAS_DRY_OUT_MIN_MINUTES,
  GAS_HIGH_BANK_LIMIT_BAR,
  GAS_INLET_LIMIT_BAR,
} from "@/lib/gas-outage"
import { prisma } from "@/lib/prisma"
import { ALL_STATIONS, type StationFilter } from "@/lib/stations"

// Read-only: these only run SELECT queries on the raw compressor readings table.
// Callers must check the session first (requireSession).
//
// Only the ICL compressor table has both a gas inlet pressure and a high-bank
// pressure column, so it is the source. To add another table with the same two
// measurements, add one more entry here.
const GAS_SOURCE = {
  table: Prisma.raw("icl_compressor_readings"),
  inlet: Prisma.raw("gas_inlate_pressure"),
  highBank: Prisma.raw("high_bank_pressure"),
}

export type GasDryOutEvent = {
  station: string
  // "YYYY-MM-DD HH24:MI" for sorting and day grouping.
  startedAt: string
  // "DD Mon YYYY, HH24:MI" for display.
  startedLabel: string
  durationMinutes: number
  readings: number
  lowestInlet: number | null
  lowestHighBank: number | null
}

export type DailyGasPressureRow = {
  day: string
  lowestInlet: number | null
  lowestHighBank: number | null
}

// The columns are text, so values are checked before they are cast.
function numeric(column: Prisma.Sql) {
  return Prisma.sql`CASE WHEN ${column} ~ '^-?[0-9]+([.][0-9]+)?$' THEN ${column}::numeric END`
}

const timestampSql = Prisma.sql`CASE WHEN date_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}' THEN substring(date_time from 1 for 19)::timestamp END`

function readingsFilter(range: DateRange, station: StationFilter) {
  return Prisma.sql`
    station_name IS NOT NULL
    AND date_time IS NOT NULL
    AND date_time >= ${range.from}::date::text
    AND date_time < (${range.to}::date + 1)::text
    ${station === ALL_STATIONS ? Prisma.empty : Prisma.sql`AND station_name = ${station}`}
  `
}

// Runs of back-to-back readings that are below both limits become one dry-out.
export async function getGasDryOutEvents(params: {
  station: StationFilter
  range: DateRange
}): Promise<GasDryOutEvent[]> {
  const { station, range } = params
  const inlet = numeric(Prisma.sql`${GAS_SOURCE.inlet}`)
  const highBank = numeric(Prisma.sql`${GAS_SOURCE.highBank}`)

  return prisma.$queryRaw<GasDryOutEvent[]>(Prisma.sql`
    WITH readings AS (
      SELECT station_name AS station, ${timestampSql} AS ts, ${inlet} AS inlet, ${highBank} AS high_bank
      FROM ${GAS_SOURCE.table}
      WHERE ${readingsFilter(range, station)}
    ),
    flagged AS (
      SELECT
        station, ts, inlet, high_bank,
        COALESCE(inlet <= ${GAS_INLET_LIMIT_BAR} AND high_bank <= ${GAS_HIGH_BANK_LIMIT_BAR}, false) AS dry
      FROM readings
      WHERE ts IS NOT NULL
    ),
    marked AS (
      SELECT
        *,
        CASE
          WHEN dry AND NOT (
            COALESCE(LAG(dry) OVER w, false)
            AND ts - LAG(ts) OVER w <= ${GAS_DRY_OUT_MAX_GAP_MINUTES} * INTERVAL '1 minute'
          ) THEN 1 ELSE 0
        END AS run_start
      FROM flagged
      WINDOW w AS (PARTITION BY station ORDER BY ts)
    ),
    runs AS (
      SELECT *, SUM(run_start) OVER (PARTITION BY station ORDER BY ts) AS run_id
      FROM marked
    )
    SELECT
      station,
      to_char(MIN(ts), 'YYYY-MM-DD HH24:MI') AS "startedAt",
      to_char(MIN(ts), 'DD Mon YYYY, HH24:MI') AS "startedLabel",
      ROUND(EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts))) / 60)::int AS "durationMinutes",
      COUNT(*)::int AS readings,
      MIN(inlet)::float8 AS "lowestInlet",
      MIN(high_bank)::float8 AS "lowestHighBank"
    FROM runs
    WHERE dry
    GROUP BY station, run_id
    HAVING ROUND(EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts))) / 60) >= ${GAS_DRY_OUT_MIN_MINUTES}
    ORDER BY MIN(ts)
  `)
}

// Lowest inlet and high-bank pressure per calendar day, including days with no readings.
export async function getDailyGasPressure(params: {
  station: StationFilter
  range: DateRange
}): Promise<DailyGasPressureRow[]> {
  const { station, range } = params
  const inlet = numeric(Prisma.sql`${GAS_SOURCE.inlet}`)
  const highBank = numeric(Prisma.sql`${GAS_SOURCE.highBank}`)

  return prisma.$queryRaw<DailyGasPressureRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(${range.from}::date, ${range.to}::date, INTERVAL '1 day')::date AS day
    ),
    readings AS (
      SELECT ${timestampSql} AS ts, ${inlet} AS inlet, ${highBank} AS high_bank
      FROM ${GAS_SOURCE.table}
      WHERE ${readingsFilter(range, station)}
    ),
    daily AS (
      SELECT
        ts::date AS day,
        MIN(inlet)::float8 AS lowest_inlet,
        MIN(high_bank)::float8 AS lowest_high_bank
      FROM readings
      WHERE ts IS NOT NULL
      GROUP BY 1
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS day,
      daily.lowest_inlet AS "lowestInlet",
      daily.lowest_high_bank AS "lowestHighBank"
    FROM days
    LEFT JOIN daily USING (day)
    ORDER BY days.day
  `)
}

// Stations that have any gas inlet and high-bank pressure readings at all.
export async function getGasMonitoredStations(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ station: string }[]>(Prisma.sql`
    SELECT DISTINCT station_name AS station
    FROM ${GAS_SOURCE.table}
    WHERE station_name IS NOT NULL
      AND ${GAS_SOURCE.inlet} IS NOT NULL
      AND ${GAS_SOURCE.highBank} IS NOT NULL
  `)
  return rows.map((row) => row.station)
}