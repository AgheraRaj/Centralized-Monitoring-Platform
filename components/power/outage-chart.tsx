"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDate, formatInteger, formatShortDate } from "@/lib/format"

const chartConfig = {
  minutes: { label: "Outage minutes", color: "oklch(0.645 0.246 16.439)" },
} satisfies ChartConfig

type OutageChartProps = {
  data: { day: string; minutes: number }[]
}

export function OutageChart({ data }: OutageChartProps) {
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
        <Bar dataKey="minutes" fill="var(--color-minutes)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}