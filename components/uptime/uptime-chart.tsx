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
  uptimePercent: { label: "Uptime (%)", color: "oklch(0.650 0.170 145.0)" },
} satisfies ChartConfig

type UptimeChartProps = {
  // null = closed day (no activity), shown as an empty slot
  data: { day: string; uptimePercent: number | null }[]
}

export function UptimeChart({ data }: UptimeChartProps) {
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
          domain={[0, 100]}
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
        <Bar dataKey="uptimePercent" fill="var(--color-uptimePercent)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}