import type { ChartConfig } from "@/components/ui/chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { FULL_FILL_THRESHOLD_BAR } from "@/lib/full-fill"

// Green = full, amber = below target, in every theme.
// Shared by every full-fill chart (Full-fill page and Overview).
export const fullFillChartConfig = {
  fullFills: {
    label: `At or above ${FULL_FILL_THRESHOLD_BAR} bar`,
    color: CHART_COLORS.good,
  },
  belowFills: {
    label: `Below ${FULL_FILL_THRESHOLD_BAR} bar`,
    color: CHART_COLORS.warning,
  },
} satisfies ChartConfig