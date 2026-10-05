import type { StationCode } from "@/lib/stations"

// Map coordinates for each station. Where a range was given (marked approximate),
// the middle of the range is used. Replace with surveyed coordinates when available.
export const STATION_LOCATIONS: Record<
  StationCode,
  { latitude: number; longitude: number; accuracy: "High" | "Medium" | "Approx." }
> = {
  CHHATRASAL_STD: { latitude: 28.7043, longitude: 77.1868, accuracy: "High" },
  KAPASHERA: { latitude: 28.5232, longitude: 77.0818, accuracy: "Medium" },
  GHAZIPUR_HYBRID: { latitude: 28.629, longitude: 77.316, accuracy: "Approx." },
  NARAYANA_DTC: { latitude: 28.649, longitude: 77.134, accuracy: "Approx." },
  SGT2: { latitude: 28.705, longitude: 77.126, accuracy: "Approx." },
  SRI_SAKTI_FUELS: { latitude: 28.655614, longitude: 77.349604, accuracy: "Approx." },
}