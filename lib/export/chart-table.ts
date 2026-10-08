import { formatDate, formatInteger } from "@/lib/format"

// The table of values that goes below the graph in a downloaded PDF.
// Every cell is already formatted text, so the PDF shows exactly what the page shows.

export type ExportColumn = { label: string; align?: "left" | "right" }

export type ExportTable = {
  columns: ExportColumn[]
  rows: string[][]
  // Optional bold last row, for example a total.
  footer?: string[]
  // Short lines printed under the table.
  notes?: string[]
}

const NO_VALUE = "--"
const left = (label: string): ExportColumn => ({ label, align: "left" })
const right = (label: string): ExportColumn => ({ label, align: "right" })

function oneDecimal(value: number | null) {
  return value === null ? NO_VALUE : value.toFixed(1)
}

function rateText(part: number, whole: number) {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : NO_VALUE
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

// ---- one value per day, with an optional previous period ------------------------------

export function vehiclesTrendTable(
  data: { day: string; vehicles: number; previousVehicles: number | null }[],
  hasComparison: boolean
): ExportTable {
  return {
    columns: [left("Date"), right("Vehicles"), ...(hasComparison ? [right("Previous period")] : [])],
    rows: data.map((row) => [
      formatDate(row.day),
      formatInteger(row.vehicles),
      ...(hasComparison
        ? [row.previousVehicles === null ? NO_VALUE : formatInteger(row.previousVehicles)]
        : []),
    ]),
    footer: [
      "Total",
      formatInteger(sum(data.map((row) => row.vehicles))),
      ...(hasComparison
        ? [formatInteger(sum(data.map((row) => row.previousVehicles ?? 0)))]
        : []),
    ],
  }
}

export function rateTrendTable(
  data: { day: string; value: number | null; previousValue: number | null }[],
  label: string,
  hasComparison: boolean
): ExportTable {
  return {
    columns: [
      left("Date"),
      right(`${label} (%)`),
      ...(hasComparison ? [right("Previous period (%)")] : []),
    ],
    rows: data.map((row) => [
      formatDate(row.day),
      oneDecimal(row.value),
      ...(hasComparison ? [oneDecimal(row.previousValue)] : []),
    ]),
  }
}

export function outageTable(
  data: { day: string; minutes: number; previousMinutes: number | null }[],
  hasComparison: boolean
): ExportTable {
  return {
    columns: [
      left("Date"),
      right("Outage (minutes)"),
      ...(hasComparison ? [right("Previous period (minutes)")] : []),
    ],
    rows: data.map((row) => [
      formatDate(row.day),
      formatInteger(row.minutes),
      ...(hasComparison
        ? [row.previousMinutes === null ? NO_VALUE : formatInteger(row.previousMinutes)]
        : []),
    ]),
    footer: [
      "Total",
      formatInteger(sum(data.map((row) => row.minutes))),
      ...(hasComparison
        ? [formatInteger(sum(data.map((row) => row.previousMinutes ?? 0)))]
        : []),
    ],
  }
}

export function pressureTable(
  data: { day: string; lowestInlet: number | null; lowestHighBank: number | null }[],
  inletLimit: number,
  highBankLimit: number
): ExportTable {
  return {
    columns: [
      left("Date"),
      right("Lowest gas inlet pressure (bar)"),
      right("Lowest high-bank pressure (bar)"),
    ],
    rows: data.map((row) => [
      formatDate(row.day),
      oneDecimal(row.lowestInlet),
      oneDecimal(row.lowestHighBank),
    ]),
    notes: [
      `Dry-out limits: gas inlet ${inletLimit} bar, high bank ${highBankLimit} bar.`,
    ],
  }
}

// ---- fills at or above / below the target ---------------------------------------------

type FillLabels = { full: string; below: string }

export function fullFillDailyTable(
  data: { day: string; fullFills: number; belowFills: number }[],
  labels: FillLabels
): ExportTable {
  const full = sum(data.map((row) => row.fullFills))
  const below = sum(data.map((row) => row.belowFills))
  return {
    columns: [
      left("Date"),
      right(labels.full),
      right(labels.below),
      right("Total fills"),
      right("Full-fill rate (%)"),
    ],
    rows: data.map((row) => [
      formatDate(row.day),
      formatInteger(row.fullFills),
      formatInteger(row.belowFills),
      formatInteger(row.fullFills + row.belowFills),
      rateText(row.fullFills, row.fullFills + row.belowFills),
    ]),
    footer: [
      "Total",
      formatInteger(full),
      formatInteger(below),
      formatInteger(full + below),
      rateText(full, full + below),
    ],
  }
}

export function vehicleClassTable(
  data: { label: string; fullFills: number; belowFills: number }[],
  labels: FillLabels
): ExportTable {
  const full = sum(data.map((row) => row.fullFills))
  const below = sum(data.map((row) => row.belowFills))
  return {
    columns: [
      left("Vehicle class"),
      right(labels.full),
      right(labels.below),
      right("Total fills"),
      right("Full-fill rate (%)"),
    ],
    rows: data.map((row) => [
      row.label,
      formatInteger(row.fullFills),
      formatInteger(row.belowFills),
      formatInteger(row.fullFills + row.belowFills),
      rateText(row.fullFills, row.fullFills + row.belowFills),
    ]),
    footer: [
      "Total",
      formatInteger(full),
      formatInteger(below),
      formatInteger(full + below),
      rateText(full, full + below),
    ],
  }
}

export function fillQualityTable(
  fullFills: number,
  belowFills: number,
  unmeasuredFills: number | null,
  labels: FillLabels
): ExportTable {
  const total = fullFills + belowFills
  return {
    columns: [left("Fills ending"), right("Fills"), right("Share of measured fills (%)")],
    rows: [
      [labels.full, formatInteger(fullFills), rateText(fullFills, total)],
      [labels.below, formatInteger(belowFills), rateText(belowFills, total)],
      ["Not measured", unmeasuredFills === null ? NO_VALUE : formatInteger(unmeasuredFills), NO_VALUE],
    ],
    footer: ["Total measured fills", formatInteger(total), total > 0 ? "100.0" : NO_VALUE],
  }
}

// ---- vehicles by weekday --------------------------------------------------------------

export function weekdayTable(
  data: { weekday: string; small: number; car: number; heavy: number }[],
  labels: { small: string; car: string; heavy: string }
): ExportTable {
  return {
    columns: [
      left("Weekday"),
      right(labels.small),
      right(labels.car),
      right(labels.heavy),
      right("Total"),
    ],
    rows: data.map((row) => [
      row.weekday,
      formatInteger(row.small),
      formatInteger(row.car),
      formatInteger(row.heavy),
      formatInteger(row.small + row.car + row.heavy),
    ]),
    notes: ["Average vehicles per day, counting only days with fills."],
  }
}

// ---- vehicles by hour of day (the heatmap) --------------------------------------------

// The heatmap has one row per station and 24 hour columns. In the table the hours
// become rows, so the table stays narrow enough for a page.
export function hourHeatmapTable(rows: { label: string; values: number[] }[]): ExportTable {
  return {
    columns: [left("Hour"), ...rows.map((row) => right(row.label)), right("Total")],
    rows: Array.from({ length: 24 }, (_, hour) => {
      const hourValues = rows.map((row) => row.values[hour] ?? 0)
      return [
        `${String(hour).padStart(2, "0")}:00`,
        ...hourValues.map((value) => formatInteger(value)),
        formatInteger(sum(hourValues)),
      ]
    }),
    footer: [
      "Total",
      ...rows.map((row) => formatInteger(sum(row.values))),
      formatInteger(sum(rows.map((row) => sum(row.values)))),
    ],
    notes: ["Vehicles served in each clock hour, added up over the whole period."],
  }
}

// ---- a simple list of measures (the gauge) --------------------------------------------

export function measuresTable(items: [label: string, value: string][]): ExportTable {
  return {
    columns: [left("Measure"), right("Value")],
    rows: items.map(([label, value]) => [label, value]),
  }
}
