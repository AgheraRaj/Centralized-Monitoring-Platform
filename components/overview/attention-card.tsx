import { DashboardPanel } from "@/components/dashboard-panel"
import { StatusBadge } from "@/components/overview/status-badge"
import { formatDuration } from "@/lib/format-duration"
import { formatInteger, formatPercent } from "@/lib/format"
import { getStationName } from "@/lib/stations"

type AttentionCardProps = {
  // False when the selected station has no voltage data.
  hasPowerData: boolean
  outageSummary: { outages: number; totalMinutes: number; longestMinutes: number } | null
  latestOutages: {
    station: string
    startedAt: string
    durationMinutes: number
    fillsDuring: number
  }[]
  // Stations with the lowest uptime, worst first.
  lowestUptime: { station: string; uptime: number }[]
  href: string
}

const LOW_UPTIME_PERCENT = 90
const OUTAGES_SHOWN = 5

export function AttentionCard({
  hasPowerData,
  outageSummary,
  latestOutages,
  lowestUptime,
  href,
}: AttentionCardProps) {
  const tiles = outageSummary
    ? [
        { label: "Outages", value: formatInteger(outageSummary.outages) },
        { label: "Downtime", value: formatDuration(outageSummary.totalMinutes) },
        { label: "Longest", value: formatDuration(outageSummary.longestMinutes) },
      ]
    : []
  const needsAttention = lowestUptime.filter((row) => row.uptime < LOW_UPTIME_PERCENT)

  return (
    <DashboardPanel
      title="Needs attention"
      description="Estimated power outages and low-uptime stations"
      href={href}
      linkLabel="Power outages"
    >
      {!hasPowerData ? (
        <p className="text-sm text-muted-foreground">
          This station has no voltage data, so outages cannot be estimated.
        </p>
      ) : outageSummary === null ? (
        <p className="text-sm text-muted-foreground">Outage data is not available.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((tile) => (
              <div key={tile.label}>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-xl font-semibold tabular-nums">{tile.value}</p>
              </div>
            ))}
          </div>

          {latestOutages.length === 0 ? (
            <div className="mt-4 rounded-lg bg-background/60 p-4 text-center text-sm text-muted-foreground">
              No outages estimated in this period.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {latestOutages.slice(0, OUTAGES_SHOWN).map((outage) => (
                <li
                  key={`${outage.station}-${outage.startedAt}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getStationName(outage.station)}
                    </p>
                    <p className="text-xs text-muted-foreground">{outage.startedAt}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatDuration(outage.durationMinutes)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatInteger(outage.fillsDuring)} fills during
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {needsAttention.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Uptime below {LOW_UPTIME_PERCENT}%
          </p>
          <div className="flex flex-wrap gap-2">
            {needsAttention.map((row) => (
              <StatusBadge key={row.station} tone="warning">
                {getStationName(row.station)} {formatPercent(row.uptime)}
              </StatusBadge>
            ))}
          </div>
        </div>
      )}
    </DashboardPanel>
  )
}