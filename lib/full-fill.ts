// A fill is a "full fill" when the dispenser pressure at fill completion
// reaches this target. IGL requirement: vehicles filled under / above 200 bar.
export const FULL_FILL_THRESHOLD_BAR = 200

// Pressures outside this range are sensor or logging errors, not real fills.
// Those fills are left out of the full-fill rate and reported as "not measured".
export const VALID_END_PRESSURE_RANGE_BAR = { min: 1, max: 400 } as const

// The dispenser data has no vehicle type, so it is estimated from the fill size.
// List the classes from smallest to largest. `maxKg` is the upper edge and is
// included in its class (a 4 kg fill is "Auto / small"). `null` means no upper limit.
// To change the bands, edit this list only. The query and the page follow it.
export const VEHICLE_CLASSES = [
  { key: "auto", label: "Auto Rikshaw", maxKg: 4 },
  { key: "car", label: "Car", maxKg: 12 },
  { key: "heavy", label: "Bus / Heavy", maxKg: null },
] as const

export type VehicleClassKey = (typeof VEHICLE_CLASSES)[number]["key"]

// Plain-text version of the bands, e.g. "Auto / small: up to 4 kg".
export function describeVehicleClassRanges() {
  let lowerEdgeKg = 0

  return VEHICLE_CLASSES.map(({ label, maxKg }) => {
    const range =
      maxKg === null
        ? `over ${lowerEdgeKg} kg`
        : lowerEdgeKg === 0
          ? `up to ${maxKg} kg`
          : `over ${lowerEdgeKg} up to ${maxKg} kg`

    if (maxKg !== null) lowerEdgeKg = maxKg
    return `${label}: ${range}`
  })
}