"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { fullFillChartConfig } from "@/components/full-fill/chart-config"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatDate, formatInteger, formatShortDate } from "@/lib/format"
import { useMemo } from "react"
import { useChartExport } from "@/components/export/chart-export-provider"
import { fullFillDailyTable } from "@/lib/export/chart-table"

type FullFillChartProps = {
  data: { day: string; fullFills: number; belowFills: number }[]
}

export function FullFillChart({ data }: FullFillChartProps) {
  const table = useMemo(() => fullFillDailyTable(data, {
    full: fullFillChartConfig.fullFills.label,
    below: fullFillChartConfig.belowFills.label,
  }), [data])
  useChartExport(table)
  return (
    <ChartContainer config={fullFillChartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatShortDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={formatInteger}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(String(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="fullFills" stackId="fills" fill="var(--color-fullFills)" />
        <Bar
          dataKey="belowFills"
          stackId="fills"
          fill="var(--color-belowFills)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
