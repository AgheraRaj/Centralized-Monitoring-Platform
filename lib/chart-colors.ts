// Semantic chart colours shared by the Overview and the Full-fill page.
// Each colour keeps the same meaning in every chart and in both themes.
export const CHART_COLORS = {
  primary: "oklch(0.62 0.19 260)", // blue: the main series
  previous: "oklch(0.7 0 0)", // grey: the previous period
  good: "oklch(0.68 0.16 155)", // green: on target
  warning: "oklch(0.78 0.15 75)", // amber: below target
  critical: "oklch(0.64 0.21 25)", // red: a problem
} as const