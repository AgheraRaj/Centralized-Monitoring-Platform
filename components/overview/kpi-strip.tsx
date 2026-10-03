import type { ReactNode } from "react"

import { StatusBadge } from "@/components/overview/status-badge"

export type Metric = {
  label: string
  value: string
  unit?: string
  change?: ReactNode
  note?: string
  badge?: { text: string; tone: "good" | "warning" | "neutral" }
}

export function KpiStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="tabular-nums">
            <span className="text-3xl font-semibold">{metric.value}</span>
            {metric.unit && (
              <span className="ml-1 text-sm text-muted-foreground">{metric.unit}</span>
            )}
          </p>
          {metric.change}
          {metric.note && (
            <p className="text-xs text-muted-foreground">{metric.note}</p>
          )}
          {metric.badge && (
            <div className="mt-1">
              <StatusBadge tone={metric.badge.tone}>{metric.badge.text}</StatusBadge>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}