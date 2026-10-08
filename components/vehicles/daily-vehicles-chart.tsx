"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDate, formatInteger, formatShortDate } from "@/lib/format"
import { useMemo } from "react"
import { useChartExport } from "@/components/export/chart-export-provider"
import { vehiclesTrendTable } from "@/lib/export/chart-table"

const chartConfig = {
  vehicles: { label: "Vehicles", color: "var(--chart-2)" },
} satisfies ChartConfig

type DailyVehiclesChartProps = {
  data: { day: string; vehicles: number }[]
}

export function DailyVehiclesChart({ data }: DailyVehiclesChartProps) {
  const table = useMemo(() => vehiclesTrendTable(data.map((row) => ({ ...row, previousVehicles: null })), false), [data])
  useChartExport(table)
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
        <Bar dataKey="vehicles" fill="var(--color-vehicles)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
