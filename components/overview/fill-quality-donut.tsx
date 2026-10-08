"use client"

import { Pie, PieChart } from "recharts"

import { fullFillChartConfig } from "@/components/full-fill/chart-config"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useMemo } from "react"
import { useChartExport } from "@/components/export/chart-export-provider"
import { fillQualityTable } from "@/lib/export/chart-table"

type FillQualityDonutProps = {
  fullFills: number
  belowFills: number
  unmeasuredFills: number | null
  // Text shown in the middle, for example "61.5%".
  centerLabel: string
}

export function FillQualityDonut({ fullFills, belowFills, unmeasuredFills, centerLabel }: FillQualityDonutProps) {
  const table = useMemo(() => fillQualityTable(fullFills, belowFills, unmeasuredFills, {
    full: fullFillChartConfig.fullFills.label,
    below: fullFillChartConfig.belowFills.label,
  }), [fullFills, belowFills, unmeasuredFills])
  useChartExport(table)
  const data = [
    { status: "fullFills", fills: fullFills, fill: "var(--color-fullFills)" },
    { status: "belowFills", fills: belowFills, fill: "var(--color-belowFills)" },
  ]

  return (
    <div data-export-target className="relative mx-auto size-44 shrink-0">
      <ChartContainer config={fullFillChartConfig} className="aspect-square size-44">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
          <Pie
            data={data}
            dataKey="fills"
            nameKey="status"
            innerRadius={58}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{centerLabel}</span>
        <span className="text-xs text-muted-foreground">full-fill</span>
      </div>
    </div>
  )
}
