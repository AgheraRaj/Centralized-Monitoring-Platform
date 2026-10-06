import { DashboardPanel } from "@/components/dashboard-panel"
import { RankingList, type RankingRow } from "@/components/overview/ranking-list"

// Kept here so existing imports of RankingRow from this file keep working.
export type { RankingRow }

type StationRankingCardProps = {
  title: string
  description: string
  valueLabel: string
  rows: RankingRow[]
  href?: string
  linkLabel?: string
}

export function StationRankingCard({
  title,
  description,
  valueLabel,
  rows,
  href,
  linkLabel,
}: StationRankingCardProps) {
  return (
    <DashboardPanel title={title} description={description} href={href} linkLabel={linkLabel}>
      <RankingList rows={rows} valueLabel={valueLabel} />
    </DashboardPanel>
  )
}