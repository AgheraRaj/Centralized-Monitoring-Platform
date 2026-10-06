import type { CompressorDayRow } from "@/lib/queries/compressors"

// Same rule as the Compressor utilization page: hours run, divided by 24 hours
// for every day a compressor reported readings.
const HOURS_PER_DAY = 24

// Percent from 0 to 100, or null when no compressor reported anything.
export function compressorUtilization(rows: CompressorDayRow[]) {
  if (rows.length === 0) return null
  const runHours = rows.reduce((total, row) => total + row.runHours, 0)
  return (runHours / (rows.length * HOURS_PER_DAY)) * 100
}

export function countCompressors(rows: CompressorDayRow[]) {
  return new Set(rows.map((row) => `${row.station}|${row.unit}`)).size
}