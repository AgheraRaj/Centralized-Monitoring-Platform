"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

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
  lowestInlet: { label: "Lowest gas inlet pressure (bar)", color: CHART_COLORS.primary },
  lowestHighBank: { label: "Lowest high-bank pressure (bar)", color: CHART_COLORS.warning },
} satisfies ChartConfig

type PressureChartProps = {
  data: { day: string; lowestInlet: number | null; lowestHighBank: number | null }[]
  inletLimit: number
  highBankLimit: number
}

export function PressureChart({ data, inletLimit, highBankLimit }: PressureChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} accessibilityLayer>
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
          domain={[0, "auto"]}
          tickFormatter={formatInteger}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine
          y={inletLimit}
          stroke="var(--color-lowestInlet)"
          strokeDasharray="4 4"
          strokeOpacity={0.7}
        />
        <ReferenceLine
          y={highBankLimit}
          stroke="var(--color-lowestHighBank)"
          strokeDasharray="4 4"
          strokeOpacity={0.7}
        />
        <Line
          dataKey="lowestInlet"
          type="monotone"
          stroke="var(--color-lowestInlet)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          dataKey="lowestHighBank"
          type="monotone"
          stroke="var(--color-lowestHighBank)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  )
}