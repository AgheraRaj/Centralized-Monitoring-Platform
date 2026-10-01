export const ALL_STATIONS = "all"

// `code` must match station_name in the database exactly.
// `name` is the label shown in the UI.
export const STATIONS = [
  { code: "CHHATRASAL_STD", name: "Chhatrasal Std" },
  { code: "GHAZIPUR_HYBRID", name: "Ghazipur Hybrid" },
  { code: "KAPASHERA", name: "Kapashera" },
  { code: "NARAYANA_DTC", name: "Narayana DTC" },
  { code: "SGT2", name: "SGT2" },
  { code: "SRI_SAKTI_FUELS", name: "Sri Sakti Fuels" },
] as const

export type StationCode = (typeof STATIONS)[number]["code"]
export type StationFilter = StationCode | typeof ALL_STATIONS

export const STATION_OPTIONS: { value: StationFilter; label: string }[] = [
  { value: ALL_STATIONS, label: "All stations" },
  ...STATIONS.map((station) => ({ value: station.code, label: station.name })),
]

// Turns the raw ?station= value from the URL into a safe, known filter.
export function resolveStationFilter(value: string | undefined): StationFilter {
  const knownStation = STATIONS.find((station) => station.code === value)
  return knownStation ? knownStation.code : ALL_STATIONS
}

export function getStationName(code: string) {
  return STATIONS.find((station) => station.code === code)?.name ?? code
}

export const POWER_MONITORED_STATIONS: readonly StationCode[] = [
  "CHHATRASAL_STD",
  "SGT2",
  "SRI_SAKTI_FUELS",
]