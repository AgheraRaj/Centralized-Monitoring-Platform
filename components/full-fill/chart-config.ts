import type { ChartConfig } from "@/components/ui/chart"
import { FULL_FILL_THRESHOLD_BAR } from "@/lib/full-fill"

// Fixed colours (green = full, amber = below target) so the meaning stays the same in any theme.
// Shared by every chart on the Full-fill page.
export const fullFillChartConfig = {
  fullFills: {
    label: `At or above ${FULL_FILL_THRESHOLD_BAR} bar`,
    color: "oklch(0.620 0.190 255.0)",
  },
  belowFills: {
    label: `Below ${FULL_FILL_THRESHOLD_BAR} bar`,
    color: "oklch(0.700 0.150 230.0)",
  },
} satisfies ChartConfig