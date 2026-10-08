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
import { formatDate, formatPercent, formatShortDate } from "@/lib/format"
import { useMemo } from "react"
import { useChartExport } from "@/components/export/chart-export-provider"
import { rateTrendTable } from "@/lib/export/chart-table"

type RateTrendChartProps = {
  // `value` and `previousValue` are percentages from 0 to 100. Null = no data that day.
  data: { day: string; value: number | null; previousValue: number | null }[]
  // Name of the measure, for example "Uptime".
  label: string
  hasComparison: boolean
  // The top of the axis. Utilization can pass 100, so it can raise this.
  maxPercent?: number
}

export function RateTrendChart({
  data,
  label,
  hasComparison,
  maxPercent = 100,
}: RateTrendChartProps) {
  const table = useMemo(() => rateTrendTable(data, label, hasComparison), [data, label, hasComparison])
  useChartExport(table)
  const chartConfig = {
    value: { label: `${label}, this period`, color: CHART_COLORS.primary },
    previousValue: { label: `${label}, previous period`, color: CHART_COLORS.previous },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} accessibilityLayer>
        <defs>
          <linearGradient id="rateTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
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
          width="auto"
          domain={[0, maxPercent]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(String(value))}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatPercent(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        {hasComparison && <ChartLegend content={<ChartLegendContent />} />}
        {hasComparison && (
          <Area
            dataKey="previousValue"
            type="monotone"
            stroke="var(--color-previousValue)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
        )}
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#rateTrendFill)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
