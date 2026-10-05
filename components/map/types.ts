export type StationStatus = "good" | "low" | "critical" | "nodata"

export type DispenserRow = {
  serial: string
  fills: number
  kg: number
  lastFillAt: string | null
  unitPrice: number | null
}

export type StationMapData = {
  code: string
  name: string
  latitude: number
  longitude: number
  accuracy: string
  status: StationStatus
  statusLabel: string
  uptime: number | null
  upHours: number
  openHours: number
  closedDays: number
  downHours: number | null
  idleHours: number | null
  hasCompressorSignal: boolean
  hasFlowSignal: boolean
  dispensers: number
  vehicles: number
  kg: number
  activeDays: number
  averagePerActiveDay: number
  ratedKgPerDay: number
  capacityKgPerHour: number
  utilization: number | null
  unitRate: number | null
  minRate: number | null
  maxRate: number | null
  lastFillAt: string | null
  dispenserRows: DispenserRow[]
}

export const STATUS_COLORS: Record<StationStatus, string> = {
  good: "oklch(0.68 0.16 155)",
  low: "oklch(0.78 0.15 75)",
  critical: "oklch(0.64 0.21 25)",
  nodata: "oklch(0.7 0 0)",
}

export function formatRate(value: number | null) {
  return value === null ? "--" : `\u20B9${value.toFixed(2)}/kg`
}