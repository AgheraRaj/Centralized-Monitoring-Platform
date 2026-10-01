type KpiCardProps = {
  label: string
  value: string
  hint?: string
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-muted p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}