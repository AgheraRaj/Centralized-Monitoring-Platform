// Row shape and sorting for the Station detail table.

export type StationDetailRow = {
  station: string
  name: string
  // Uptime in percent, or null when the station has no open hours.
  rate: number | null
  upHours: number
  // Null when the Down/Idle split could not be loaded.
  idleHours: number | null
  downHours: number | null
  closedDays: number
  sources: string[]
}

export type SortKey =
  | "name"
  | "rate"
  | "upHours"
  | "idleHours"
  | "downHours"
  | "closedDays"

export type SortDirection = "asc" | "desc"

// Rows with no value (null) always go last, whichever way the table is sorted.
export function sortRows(
  rows: StationDetailRow[],
  key: SortKey,
  direction: SortDirection
) {
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1

    const comparison =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right)
        : Number(left) - Number(right)

    return comparison * factor
  })
}

// Plain-language description of the current order, for the line above the table.
export function describeSort(key: SortKey, direction: SortDirection) {
  const labels: Record<SortKey, string> = {
    name: "Station",
    rate: "Uptime",
    upHours: "Hours up",
    idleHours: "Hours idle",
    downHours: "Hours down",
    closedDays: "Closed days",
  }
  const order =
    key === "name"
      ? direction === "asc" ? "A to Z" : "Z to A"
      : key === "rate"
        ? direction === "asc" ? "lowest first" : "highest first"
        : direction === "asc" ? "smallest first" : "largest first"

  return `${labels[key]}, ${order}`
}