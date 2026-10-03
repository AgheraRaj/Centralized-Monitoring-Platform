import { getPreviousRange, type DateRange } from "@/lib/date-range"

export function sumOf<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((sum, row) => sum + pick(row), 0)
}

// Returns a number from 0 to 100, or null when there is nothing to divide by.
export function percentOf(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : null
}

// Change in percent, e.g. 120 -> 150 is +25. Null when there is no earlier value.
export function relativeChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

// Change in percentage points, for values that are already percentages.
export function pointChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null
  return current - previous
}

// The previous period is only used when it lies fully inside the available data,
// otherwise the comparison would be against a shorter period and mislead.
export function getComparisonRange(range: DateRange, earliestDate: string) {
  const previous = getPreviousRange(range)
  return previous.from >= earliestDate ? previous : null
}

const HOURS_PER_DAY = 24

// Turns "label, hour, vehicles" rows into one row per label with 24 hourly values.
export function buildHourlyRows(
  rows: { label: string; hour: number; vehicles: number }[]
) {
  const valuesByLabel = new Map<string, number[]>()

  for (const row of rows) {
    const values =
      valuesByLabel.get(row.label) ?? Array.from({ length: HOURS_PER_DAY }, () => 0)
    values[row.hour] = row.vehicles
    valuesByLabel.set(row.label, values)
  }

  return [...valuesByLabel.entries()]
    .map(([label, values]) => ({
      label,
      values,
      total: sumOf(values, (value) => value),
    }))
    .sort((a, b) => b.total - a.total)
}