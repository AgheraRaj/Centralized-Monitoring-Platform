import { FillQualityDonut } from "@/components/overview/fill-quality-donut"
import { DashboardPanel } from "@/components/dashboard-panel"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatInteger, formatPercent } from "@/lib/format"
import { FULL_FILL_THRESHOLD_BAR } from "@/lib/full-fill"
import { percentOf } from "@/lib/overview"

type FillQualityCardProps = {
  fullFills: number
  belowFills: number
  unmeasuredFills: number | null
  href: string
}

export function FillQualityCard({
  fullFills,
  belowFills,
  unmeasuredFills,
  href,
}: FillQualityCardProps) {
  const measuredFills = fullFills + belowFills
  const rate = percentOf(fullFills, measuredFills)

  const stats = [
    {
      label: `At or above ${FULL_FILL_THRESHOLD_BAR} bar`,
      value: fullFills,
      share: rate,
      color: CHART_COLORS.good,
    },
    {
      label: `Below ${FULL_FILL_THRESHOLD_BAR} bar`,
      value: belowFills,
      share: rate === null ? null : 100 - rate,
      color: CHART_COLORS.warning,
    },
  ]

  return (
    <DashboardPanel
      title="Fill quality"
      description={`Fills by the pressure reached at the end of the fill, target ${FULL_FILL_THRESHOLD_BAR} bar`}
      href={href}
      linkLabel="Full-fill rate"
      contentAlign="end"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <FillQualityDonut
          fullFills={fullFills}
          belowFills={belowFills}
          centerLabel={rate === null ? "--" : formatPercent(rate)}
        />
        <div className="grid w-full flex-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: stat.color }}
                />
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatInteger(stat.value)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stat.share === null ? "--" : formatPercent(stat.share)} of measured fills
              </p>
            </div>
          ))}
          <div>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Not measured
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {unmeasuredFills === null ? "--" : formatInteger(unmeasuredFills)}
            </p>
            <p className="text-xs text-muted-foreground">
              End pressure missing or impossible, left out of the rate
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}