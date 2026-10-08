import { RangeSelector } from "@/components/range-selector"
import { ExportContextSetter } from "@/components/export-context-setter"
import { formatDate } from "@/lib/format"

type PageHeaderProps = {
  title: string
  stationLabel: string
  range: { from: string; to: string }
  // Optional explanation of how the numbers on the page are worked out.
  note?: string
}

// The title block shared by every dashboard page.
export function PageHeader({ title, stationLabel, range, note }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <ExportContextSetter context={`${stationLabel} · ${formatDate(range.from)} to ${formatDate(range.to)}`} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {stationLabel} · {formatDate(range.from)} to {formatDate(range.to)}
        </p>
        {note && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{note}</p>}
      </div>
      <RangeSelector />
    </div>
  )
}
