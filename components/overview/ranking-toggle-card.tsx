"use client"

import { useState } from "react"

import { DashboardPanel } from "@/components/dashboard-panel"
import { RankingList, type RankingRow } from "@/components/overview/ranking-list"

export type RankingMetric = {
  key: string
  // Text on the switch button, for example "By vehicles".
  label: string
  // Card description while this metric is selected.
  description: string
  // Unit shown after each value.
  valueLabel: string
}

export type ToggleRankingRow = {
  label: string
  // One number and one detail line for every metric key.
  values: Record<string, number>
  details: Record<string, string>
  uptime?: number | null
}

type RankingToggleCardProps = {
  title: string
  metrics: RankingMetric[]
  rows: ToggleRankingRow[]
  href?: string
  linkLabel?: string
}

// A ranking card with a switch to rank by another measure (vehicles or gas sold).
// The switch is hidden when only one measure is available.
export function RankingToggleCard({
  title,
  metrics,
  rows,
  href,
  linkLabel,
}: RankingToggleCardProps) {
  const [metricKey, setMetricKey] = useState(metrics[0].key)
  const metric = metrics.find((candidate) => candidate.key === metricKey) ?? metrics[0]

  const rankedRows: RankingRow[] = rows
    .map((row) => ({
      label: row.label,
      value: row.values[metric.key] ?? 0,
      detail: row.details[metric.key] ?? "",
      uptime: row.uptime,
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <DashboardPanel
      title={title}
      description={metric.description}
      href={href}
      linkLabel={linkLabel}
    >
      {metrics.length > 1 && (
        <div
          role="group"
          aria-label="Rank by"
          className="mb-4 inline-flex rounded-lg bg-background/60 p-1"
        >
          {metrics.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={option.key === metric.key}
              onClick={() => setMetricKey(option.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                option.key === metric.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <RankingList rows={rankedRows} valueLabel={metric.valueLabel} />
    </DashboardPanel>
  )
}