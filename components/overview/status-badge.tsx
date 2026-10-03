import type { ReactNode } from "react"

type StatusBadgeProps = {
  tone?: "good" | "warning" | "neutral"
  children: ReactNode
}

const TONE_CLASSES = {
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  neutral: "bg-foreground/10 text-muted-foreground",
} as const

export function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}