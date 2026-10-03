import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { formatDecimal } from "@/lib/format"

type ChangeBadgeProps = {
  // Change against the previous period. Null means there is nothing to compare with.
  change: number | null
  // "%" for a relative change, "pp" for percentage points.
  unit: "%" | "pp"
  // Which direction is good news: more vehicles is good, more downtime is not.
  goodWhen?: "up" | "down"
}

export function ChangeBadge({ change, unit, goodWhen = "up" }: ChangeBadgeProps) {
  if (change === null) return null

  const isFlat = Math.abs(change) < 0.05
  const isUp = change > 0
  const isGood = goodWhen === "up" ? isUp : !isUp

  const colorClass = isFlat
    ? "text-muted-foreground"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400"
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight
  const amount = `${formatDecimal(Math.abs(change))}${unit === "%" ? "%" : " pp"}`

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-medium ${colorClass}`}>
        <Icon className="size-3.5" />
        {amount}
      </span>
      <span className="text-muted-foreground">vs previous period</span>
    </span>
  )
}