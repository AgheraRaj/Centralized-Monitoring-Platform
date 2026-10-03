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

const chartConfig = {
  vehicles: { label: "This period", color: CHART_COLORS.primary },
  previousVehicles: { label: "Previous period", color: CHART_COLORS.previous },
} satisfies ChartConfig

type VehiclesTrendChartProps = {
  data: { day: string; vehicles: number; previousVehicles: number | null }[]
  hasComparison: boolean
}

export function VehiclesTrendChart({ data, hasComparison }: VehiclesTrendChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} accessibilityLayer>
        <defs>
          <linearGradient id="overviewVehiclesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-vehicles)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-vehicles)" stopOpacity={0.02} />
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
            dataKey="previousVehicles"
            type="monotone"
            stroke="var(--color-previousVehicles)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
        )}
        <Area
          dataKey="vehicles"
          type="monotone"
          stroke="var(--color-vehicles)"
          strokeWidth={2}
          fill="url(#overviewVehiclesFill)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}