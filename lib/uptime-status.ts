import { CHART_COLORS } from "@/lib/chart-colors"

// Change these numbers to change how the Station uptime page judges a station.

// An hour that is not up counts as DOWN when the average priority pressure in
// that hour is this many bar or lower. Above it, the hour counts as IDLE.
export const STATION_DOWN_MAX_PRESSURE_BAR = 150

// Uptime at or above this is green. Below it is amber.
export const LOW_UPTIME_PERCENT = 90

// Uptime below this is red.
export const CRITICAL_UPTIME_PERCENT = 30

export type UptimeTone = "good" | "low" | "critical"

export const UPTIME_TONE_COLORS: Record<UptimeTone, string> = {
  good: CHART_COLORS.good,
  low: CHART_COLORS.warning,
  critical: CHART_COLORS.critical,
}

export function getUptimeTone(rate: number | null): UptimeTone | null {
  if (rate === null) return null
  if (rate < CRITICAL_UPTIME_PERCENT) return "critical"
  if (rate < LOW_UPTIME_PERCENT) return "low"
  return "good"
}