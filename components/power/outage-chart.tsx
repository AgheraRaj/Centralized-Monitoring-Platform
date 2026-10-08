"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatDate, formatInteger, formatShortDate } from "@/lib/format"
import { useMemo } from "react"
import { useChartExport } from "@/components/export/chart-export-provider"
import { outageTable } from "@/lib/export/chart-table"

const chartConfig = {
  minutes: { label: "This period", color: CHART_COLORS.critical },
  previousMinutes: { label: "Previous period", color: CHART_COLORS.previous },
} satisfies ChartConfig

type OutageChartProps = {
  data: { day: string; minutes: number; previousMinutes: number | null }[]
  hasComparison: boolean
}

export function OutageChart({ data, hasComparison }: OutageChartProps) {
  const table = useMemo(() => outageTable(data, hasComparison), [data, hasComparison])
  useChartExport(table)
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} accessibilityLayer>
        <defs>
          <linearGradient id="outageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-minutes)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-minutes)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        {hasComparison && <ChartLegend content={<ChartLegendContent />} />}
        {hasComparison && (
          <Area
            dataKey="previousMinutes"
            type="monotone"
            stroke="var(--color-previousMinutes)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
        )}
        <Area
          dataKey="minutes"
          type="monotone"
          stroke="var(--color-minutes)"
          strokeWidth={2}
          fill="url(#outageFill)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
