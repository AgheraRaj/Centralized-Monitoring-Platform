import type { ReactNode } from "react"

import { DashboardPanel } from "@/components/dashboard-panel"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatInteger } from "@/lib/format"

export type VehicleClassItem = {
  label: string
  rule: string
  count: number
  color: string
  change?: ReactNode
}

export const VEHICLE_CLASS_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.good,
  CHART_COLORS.warning,
] as const

export function VehicleClassCard({ items }: { items: VehicleClassItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <DashboardPanel
      title="Vehicles by type"
      description="Estimated from the gas filled in each vehicle"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const share = total > 0 ? (item.count / total) * 100 : 0
          return (
            <div key={item.label} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.rule}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatInteger(item.count)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatInteger(share)}% of vehicles
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, backgroundColor: item.color }}
                />
              </div>
              {item.change}
            </div>
          )
        })}
      </div>
    </DashboardPanel>
  )
}