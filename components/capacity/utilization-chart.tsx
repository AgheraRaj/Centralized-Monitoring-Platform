"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDate, formatShortDate } from "@/lib/format"

const chartConfig = {
  utilizationPercent: {
    label: "Utilization (%)",
    color: "oklch(0.650 0.150 175.0)",
  },
} satisfies ChartConfig

type UtilizationChartProps = {
  // null = day with no fills, shown as an empty slot
  data: { day: string; utilizationPercent: number | null }[]
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
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
          // Normally 0 to 100, but grows if utilization ever goes above 100%.
          domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax))]}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(String(value))}
            />
          }
        />
        <Bar
          dataKey="utilizationPercent"
          fill="var(--color-utilizationPercent)"
          radius={4}
        />
      </BarChart>
    </ChartContainer>
  )
}