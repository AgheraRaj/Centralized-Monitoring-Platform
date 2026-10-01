export const RANGE_PRESETS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All data", days: null },
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"]

export const DEFAULT_RANGE_PRESET: RangePreset = "30d"

// All dates are ISO strings (YYYY-MM-DD). Plain strings avoid time zone surprises.
export type DateBounds = { earliest: string; latest: string }
export type DateRange = { from: string; to: string }

export function resolveRangePreset(value: string | undefined): RangePreset {
  const preset = RANGE_PRESETS.find((candidate) => candidate.value === value)
  return preset ? preset.value : DEFAULT_RANGE_PRESET
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// "Last N days" is counted back from the newest date that has data, not from today,
// so a dashboard is never empty just because the data stops in the past.
export function resolveDateRange(
  preset: RangePreset,
  bounds: DateBounds
): DateRange {
  const days = RANGE_PRESETS.find((candidate) => candidate.value === preset)?.days

  if (days === null || days === undefined) {
    return { from: bounds.earliest, to: bounds.latest }
  }

  const from = addDays(bounds.latest, -(days - 1))
  return { from: from < bounds.earliest ? bounds.earliest : from, to: bounds.latest }
}