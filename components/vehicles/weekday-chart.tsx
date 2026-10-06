"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatInteger } from "@/lib/format"

// Same colours as the "Vehicles by type" card.
const chartConfig = {
  small: { label: "Auto / small", color: CHART_COLORS.primary },
  car: { label: "Car", color: CHART_COLORS.good },
  heavy: { label: "Bus / heavy", color: CHART_COLORS.warning },
} satisfies ChartConfig

type WeekdayChartProps = {
  data: { weekday: string; small: number; car: number; heavy: number }[]
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  return (
    <ChartContainer config={chartConfig} className="sm:mt-30 aspect-auto h-72 w-full">
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
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="small" stackId="vehicles" fill="var(--color-small)" />
        <Bar dataKey="car" stackId="vehicles" fill="var(--color-car)" />
        <Bar
          dataKey="heavy"
          stackId="vehicles"
          fill="var(--color-heavy)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}