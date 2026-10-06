import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"

// Read-only: these only run SELECT queries on the raw compressor readings tables.
// Callers must check the session first (requireSession).
//
// Every compressor table keeps a running-hour counter that only goes up while the
// compressor runs. The hours run on a day are the sum of the counter increases
// between back-to-back readings, so a counter reset or a missing stretch of
// readings cannot create fake hours.

export type CompressorDayRow = {
  station: string
  // "<table>|<equipment name>", split it with parseCompressorUnit.
  unit: string
  day: string
  // Hours the compressor ran on this day (0 to 24).
  runHours: number
}

// Readings further apart than this are skipped instead of guessed.
const MAX_GAP_HOURS = 6

const SOURCE_LABELS: Record<string, string> = {
  bukt: "Bukt",
  chhatrasal_kpcl: "KPCL",
  delta: "Delta",
  icl: "ICL",
  sgtn2_kpcl: "KPCL",
  tulip: "Tulip",
}

export function parseCompressorUnit(unit: string) {
  const [source, equipment = ""] = unit.split("|")
  const sourceLabel = SOURCE_LABELS[source] ?? source
  return {
    sourceLabel,
    label: equipment.trim() ? `${sourceLabel} · ${equipment.trim()}` : sourceLabel,
  }
}

// One row per compressor and day that sent running-hour readings.
export async function getCompressorDailyRuns(range: DateRange): Promise<CompressorDayRow[]> {
  return prisma.$queryRaw<CompressorDayRow[]>(Prisma.sql`
    WITH source AS (
      SELECT 'bukt' AS source, station_name, equipment_name, date_time,
             compressor_running_hour AS run_hour, NULL::text AS run_min
      FROM bukt_compressor_readings
      UNION ALL
      SELECT 'chhatrasal_kpcl', station_name, equipment_name, date_time,
             compressor_run_hour, NULL::text
      FROM chhatrashal_kpcl_compressor_readings
      UNION ALL
      SELECT 'delta', station_name, equipment_name, date_time,
             running_hour, NULL::text
      FROM delta_compressor_readings
      UNION ALL
      SELECT 'icl', station_name, equipment_name, date_time,
             run_hour, run_min
      FROM icl_compressor_readings
      UNION ALL
      SELECT 'sgtn2_kpcl', station_name, equipment_name, date_time,
             compressor_run_hour, NULL::text
      FROM sgtn2_kpcl_compressor_readings
      UNION ALL
      SELECT 'tulip', station_name, equipment_name, date_time,
             comp_running_hour, NULL::text
      FROM tulip_compressor_readings
    ),
    parsed AS (
      -- Every source column is text, so each value is checked before it is cast.
      SELECT
        station_name AS station,
        source || '|' || COALESCE(equipment_name, '') AS unit,
        CASE WHEN date_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}'
             THEN substring(date_time from 1 for 19)::timestamp END AS ts,
        CASE WHEN run_hour ~ '^[0-9]+([.][0-9]+)?$'
             THEN run_hour::numeric
                  + CASE WHEN run_min ~ '^[0-9]+([.][0-9]+)?$' THEN run_min::numeric / 60 ELSE 0 END
        END AS hours
      FROM source
      WHERE station_name IS NOT NULL
        AND date_time IS NOT NULL
        AND date_time >= ${range.from}::date::text
        AND date_time < (${range.to}::date + 1)::text
    ),
    steps AS (
      SELECT
        station, unit, ts,
        hours - LAG(hours) OVER w AS added_hours,
        EXTRACT(EPOCH FROM (ts - LAG(ts) OVER w)) / 3600 AS gap_hours
      FROM parsed
      WHERE ts IS NOT NULL AND hours IS NOT NULL
      WINDOW w AS (PARTITION BY station, unit ORDER BY ts)
    ),
    valid AS (
      SELECT station, unit, ts::date AS day, LEAST(added_hours, gap_hours) AS run_hours
      FROM steps
      WHERE added_hours >= 0
        AND gap_hours > 0
        AND gap_hours <= ${MAX_GAP_HOURS}
        AND added_hours <= gap_hours * 1.1 + 0.05
    ),
    reporting_days AS (
      SELECT DISTINCT station, unit, ts::date AS day FROM steps
    ),
    daily AS (
      SELECT station, unit, day, SUM(run_hours) AS run_hours FROM valid GROUP BY 1, 2, 3
    )
    SELECT
      reporting_days.station AS station,
      reporting_days.unit AS unit,
      to_char(reporting_days.day, 'YYYY-MM-DD') AS day,
      LEAST(COALESCE(daily.run_hours, 0), 24)::float8 AS "runHours"
    FROM reporting_days
    LEFT JOIN daily USING (station, unit, day)
    ORDER BY reporting_days.station, reporting_days.unit, reporting_days.day
  `)
}