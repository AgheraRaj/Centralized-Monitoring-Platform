import type { DateRange } from "@/lib/date-range"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/app/generated/prisma/client"

// Read-only: SELECT queries on mv_dispenser_fills and dispenser_readings.
// Callers must check the session first (requireSession).

export type DispenserDetailRow = {
  station: string
  serial: string
  fills: number
  kg: number
  lastFillAt: string | null
  // Latest unit price (rupees per kg) seen on this dispenser, or null if none.
  unitPrice: number | null
}

// One row per dispenser. Fills and kg come from the selected range. The unit price
// is the latest reading in the 60 days up to the end of the range, because a
// price is a current setting and should not disappear on a quiet week.
// unit_price is text in the source table, so it is checked before it is cast.
export async function getDispenserDetails(
  range: DateRange
): Promise<DispenserDetailRow[]> {
  return prisma.$queryRaw<DispenserDetailRow[]>(Prisma.sql`
    WITH fills AS (
      SELECT
        station_name,
        serial_number,
        COUNT(*)::int AS fills,
        COALESCE(SUM(quantity_kg), 0)::float8 AS kg,
        to_char(MAX(ended_at), 'YYYY-MM-DD HH24:MI') AS last_fill_at
      FROM mv_dispenser_fills
      WHERE ended_at >= ${range.from}::date
        AND ended_at < ${range.to}::date + 1
      GROUP BY 1, 2
    ),
    prices AS (
      SELECT DISTINCT ON (station_name, serial_number)
        station_name,
        serial_number,
        unit_price::numeric AS price
      FROM dispenser_readings
      WHERE station_name IS NOT NULL
        AND serial_number IS NOT NULL
        AND unit_price ~ '^[0-9]+([.][0-9]+)?$'
        AND date_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
        AND date_time < (${range.to}::date + 1)::text
        AND date_time >= (${range.to}::date - 60)::text
      ORDER BY station_name, serial_number, date_time DESC
    )
    SELECT
      COALESCE(fills.station_name, prices.station_name) AS station,
      COALESCE(fills.serial_number, prices.serial_number) AS serial,
      COALESCE(fills.fills, 0)::int AS fills,
      COALESCE(fills.kg, 0)::float8 AS kg,
      fills.last_fill_at AS "lastFillAt",
      prices.price::float8 AS "unitPrice"
    FROM fills
    FULL JOIN prices
      ON prices.station_name = fills.station_name
     AND prices.serial_number = fills.serial_number
    ORDER BY 1, 2
  `)
}