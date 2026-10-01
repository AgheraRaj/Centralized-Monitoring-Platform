// Fixed locale so the server and the browser always print the same text.
const integerFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

function parseIsoDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`)
}

export function formatInteger(value: number) {
  return integerFormatter.format(value)
}

export function formatDate(isoDate: string) {
  return dateFormatter.format(parseIsoDate(isoDate))
}

export function formatShortDate(isoDate: string) {
  return shortDateFormatter.format(parseIsoDate(isoDate))
}

const decimalFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
})

export function formatDecimal(value: number) {
  return decimalFormatter.format(value)
}

// `value` is a number from 0 to 100.
export function formatPercent(value: number) {
  return `${decimalFormatter.format(value)}%`
}