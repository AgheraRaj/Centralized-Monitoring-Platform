"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatDecimal, formatInteger, formatPercent } from "@/lib/format"

export type BreakdownRow = {
  label: string
  fills: number
  rate: number
  averageEndPressure: number
}

type SortKey = "label" | "fills" | "rate" | "averageEndPressure"
type SortDirection = "asc" | "desc"

type BreakdownTableProps = {
  firstColumnLabel: string
  rows: BreakdownRow[]
}

type Sort = { key: SortKey; direction: SortDirection } | null

function SortHead({
  column,
  sort,
  onToggle,
  children,
  align = "right",
}: {
  column: SortKey
  sort: Sort
  onToggle: (key: SortKey) => void
  children: string
  align?: "left" | "right"
}) {
  const active = sort?.key === column
  const Icon = !sort || !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={align === "right" ? "text-right" : undefined}
      aria-sort={active && sort ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-foreground" : ""}`}
      >
        {children}
        <Icon className={`size-3.5 ${active ? "" : "opacity-40"}`} />
      </button>
    </TableHead>
  )
}

export function BreakdownTable({ firstColumnLabel, rows }: BreakdownTableProps) {
  // null = original order from the query.
  const [sort, setSort] = useState<Sort>(null)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) =>
      sort.key === "label"
        ? factor * a.label.localeCompare(b.label, undefined, { numeric: true })
        : factor * (a[sort.key] - b[sort.key])
    )
  }, [rows, sort])

  // Click once for ascending, again for descending, a third time to reset.
  function toggle(key: SortKey) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" }
      if (current.direction === "asc") return { key, direction: "desc" }
      return null
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHead column="label" align="left" sort={sort} onToggle={toggle}>
            {firstColumnLabel}
          </SortHead>
          <SortHead column="fills" sort={sort} onToggle={toggle}>Fills</SortHead>
          <SortHead column="rate" sort={sort} onToggle={toggle}>Full-fill rate</SortHead>
          <SortHead column="averageEndPressure" sort={sort} onToggle={toggle}>Avg end pressure (bar)</SortHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatInteger(row.fills)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.rate}%`, backgroundColor: CHART_COLORS.good }}
                  />
                </div>
                <span className="w-14 text-right tabular-nums">
                  {formatPercent(row.rate)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDecimal(row.averageEndPressure)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}