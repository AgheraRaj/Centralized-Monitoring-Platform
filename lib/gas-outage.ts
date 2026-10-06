// A gas dry-out is when BOTH conditions hold at the same time:
//   gas inlet pressure <= 40 bar  AND  high-bank pressure <= 180 bar.
export const GAS_INLET_LIMIT_BAR = 40
export const GAS_HIGH_BANK_LIMIT_BAR = 180

// Dry-outs shorter than this are treated as noise and are not counted.
export const GAS_DRY_OUT_MIN_MINUTES = 5

// Readings further apart than this are not joined into one dry-out.
export const GAS_DRY_OUT_MAX_GAP_MINUTES = 30