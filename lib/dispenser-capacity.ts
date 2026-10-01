import type { StationCode } from "@/lib/stations"

// Rated capacity of ONE dispenser in kg per hour (IGL gap-analysis sheet, row 30):
// 180 kg/hr at online stations, 120 kg/hr at booster compressors.
// Every station is set to 180 for now. Change a station to 120 if it is a booster.
export const DISPENSER_CAPACITY_KG_PER_HOUR: Record<StationCode, number> = {
  CHHATRASAL_STD: 180,
  GHAZIPUR_HYBRID: 180,
  KAPASHERA: 180,
  NARAYANA_DTC: 180,
  SGT2: 180,
  SRI_SAKTI_FUELS: 180,
}

const DEFAULT_CAPACITY_KG_PER_HOUR = 180
const HOURS_PER_DAY = 24

export function getCapacityKgPerHour(stationCode: string) {
  return (
    DISPENSER_CAPACITY_KG_PER_HOUR[stationCode as StationCode] ??
    DEFAULT_CAPACITY_KG_PER_HOUR
  )
}

// Rated capacity per day = dispensers x kg per hour x 24 hours.
export function getRatedCapacityKgPerDay(stationCode: string, dispensers: number) {
  return dispensers * getCapacityKgPerHour(stationCode) * HOURS_PER_DAY
}