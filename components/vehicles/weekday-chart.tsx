"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatInteger } from "@/lib/format"

const chartConfig = {
  averageVehicles: { label: "Average vehicles", color: CHART_COLORS.primary },
} satisfies ChartConfig

type WeekdayChartProps = {
  data: { weekday: string; averageVehicles: number }[]
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="weekday" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width="auto"
          allowDecimals={false}
          tickFormatter={formatInteger}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="averageVehicles" fill="var(--color-averageVehicles)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}