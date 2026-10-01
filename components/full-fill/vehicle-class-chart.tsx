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
import { formatInteger } from "@/lib/format"

type VehicleClassChartProps = {
  data: { label: string; fullFills: number; belowFills: number }[]
}

// Side-by-side bars (not stacked) so the two groups are easy to compare per class.
export function VehicleClassChart({ data }: VehicleClassChartProps) {
  return (
    <ChartContainer config={fullFillChartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={formatInteger}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="fullFills" fill="var(--color-fullFills)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="belowFills" fill="var(--color-belowFills)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}