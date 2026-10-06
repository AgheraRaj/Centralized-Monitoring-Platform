import { Prisma } from "@/app/generated/prisma/client"
import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"

// Read-only: these only run SELECT queries on the raw compressor readings tables.
// Callers must check the session first (requireSession).
//
// Every compressor table keeps a running-hour counter that only goes up while the
// compressor runs. The hours run on a day are how far the counter moved since the
// last reading of the previous day. Because the days add up to (last counter value
// minus first counter value), the total for a period matches checking the counter
// by hand, whatever the resolution of the counter is (whole hours, hours with
// decimals, hours:minutes, or minutes).

export type CompressorDayRow = {
  station: string
  // "<table>|<equipment name>", split it with parseCompressorUnit.
  unit: string
  day: string
  // Hours the compressor ran on this day (0 to 24).
  runHours: number
}

// A compressor cannot run more than 24 hours in a day. A bigger step means a bad
// reading, so that day is left out instead of being counted.
const MAX_HOURS_PER_DAY = Prisma.raw("24.5")

// Where each compressor keeps its running-hour counter.
// Only ICL splits it into a hour column and a minute column.
const SOURCES = [
  { key: "bukt", table: "bukt_compressor_readings", hour: "compressor_running_hour" },
  { key: "chhatrasal_kpcl", table: "chhatrashal_kpcl_compressor_readings", hour: "compressor_run_hour" },
  { key: "delta", table: "delta_compressor_readings", hour: "running_hour" },
  { key: "icl", table: "icl_compressor_readings", hour: "run_hour", minute: "run_min" },
  { key: "sgtn2_kpcl", table: "sgtn2_kpcl_compressor_readings", hour: "compressor_run_hour" },
  { key: "tulip", table: "tulip_compressor_readings", hour: "comp_running_hour" },
] as const

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

// The columns are text. A counter can be a plain number (12345 or 12345.5) or a
// clock style value (12345:30), so both are read, and anything else is ignored.
// If there is a minute column its value is added as minutes.
function counterHoursSql(hourColumn: string, minuteColumn?: string) {
  const hour = Prisma.sql`btrim(${Prisma.raw(hourColumn)})`
  const clock = Prisma.sql`CASE WHEN ${hour} ~ '^[0-9]+:[0-9]{2}(:[0-9]{2})?$'
    THEN split_part(${hour}, ':', 1)::numeric
         + split_part(${hour}, ':', 2)::numeric / 60
         + COALESCE(NULLIF(split_part(${hour}, ':', 3), '')::numeric, 0) / 3600
    END`
  const plain = Prisma.sql`CASE WHEN ${hour} ~ '^[0-9]+([.][0-9]+)?$' THEN ${hour}::numeric END`
  const base = Prisma.sql`COALESCE(${clock}, ${plain})`

  if (!minuteColumn) return base

  const minute = Prisma.sql`btrim(${Prisma.raw(minuteColumn)})`
  return Prisma.sql`${base} + CASE WHEN ${minute} ~ '^[0-9]+([.][0-9]+)?$' THEN ${minute}::numeric / 60 ELSE 0 END`
}

// One row per compressor and day that sent running-hour readings.
export async function getCompressorDailyRuns(range: DateRange): Promise<CompressorDayRow[]> {
  // The day before the range is read too, so the first day of the range also
  // counts the hours run after that day's last reading. It is dropped at the end.
  const sources = SOURCES.map(
    (source) => Prisma.sql`
      SELECT ${source.key}::text AS source, station_name, equipment_name, date_time,
             ${counterHoursSql(source.hour, "minute" in source ? source.minute : undefined)} AS hours
      FROM ${Prisma.raw(source.table)}
      WHERE station_name IS NOT NULL
        AND date_time IS NOT NULL
        AND date_time >= (${range.from}::date - 1)::text
        AND date_time < (${range.to}::date + 1)::text`
  )

  return prisma.$queryRaw<CompressorDayRow[]>(Prisma.sql`
    WITH source AS (
      ${Prisma.join(sources, " UNION ALL ")}
    ),
    parsed AS (
      SELECT
        station_name AS station,
        source || '|' || COALESCE(equipment_name, '') AS unit,
        CASE WHEN date_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}'
             THEN substring(date_time from 1 for 19)::timestamp END AS ts,
        hours
      FROM source
    ),
    per_day AS (
      SELECT station, unit, ts::date AS day, MIN(hours) AS min_hours, MAX(hours) AS max_hours
      FROM parsed
      WHERE ts IS NOT NULL AND hours IS NOT NULL
      GROUP BY 1, 2, 3
    ),
    chained AS (
      SELECT
        *,
        LAG(max_hours) OVER w AS previous_max,
        LAG(day) OVER w AS previous_day
      FROM per_day
      WINDOW w AS (PARTITION BY station, unit ORDER BY day)
    ),
    moved AS (
      -- Counter movement since the last reading of the day before. If that day is
      -- missing, or the counter was reset, use the movement inside the day.
      SELECT
        station, unit, day,
        CASE
          WHEN previous_day = day - 1 AND max_hours >= previous_max THEN max_hours - previous_max
          ELSE max_hours - min_hours
        END AS counter_hours
      FROM chained
    ),
    scale AS (
      -- A counter that normally moves more than 24 per day cannot be in hours, so
      -- it is in minutes and is divided by 60.
      SELECT
        station, unit,
        CASE
          WHEN percentile_cont(0.5) WITHIN GROUP (ORDER BY counter_hours) > ${MAX_HOURS_PER_DAY}
          THEN 1.0 / 60 ELSE 1.0
        END AS factor
      FROM moved
      GROUP BY 1, 2
    )
    SELECT
      moved.station AS station,
      moved.unit AS unit,
      to_char(moved.day, 'YYYY-MM-DD') AS day,
      LEAST(moved.counter_hours * scale.factor, 24)::float8 AS "runHours"
    FROM moved
    JOIN scale USING (station, unit)
    WHERE moved.day >= ${range.from}::date
      AND moved.day <= ${range.to}::date
      AND moved.counter_hours * scale.factor <= ${MAX_HOURS_PER_DAY}
    ORDER BY moved.station, moved.unit, moved.day
  `)
}