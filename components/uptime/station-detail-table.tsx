"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useState } from "react"

import { StatusBadge } from "@/components/overview/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatInteger, formatPercent } from "@/lib/format"
import {
  describeSort,
  sortRows,
  type SortDirection,
  type SortKey,
  type StationDetailRow,
} from "@/lib/uptime-table"
import { getUptimeTone, UPTIME_TONE_COLORS } from "@/lib/uptime-status"

type Column = { key: SortKey; label: string; align: "left" | "right" }

const COLUMNS: Column[] = [
  { key: "name", label: "Station", align: "left" },
  { key: "rate", label: "Uptime", align: "right" },
  { key: "upHours", label: "Hours up", align: "right" },
  { key: "idleHours", label: "Hours idle", align: "right" },
  { key: "downHours", label: "Hours down", align: "right" },
  { key: "closedDays", label: "Closed days", align: "right" },
]

function showHours(value: number | null) {
  return value === null ? "--" : formatInteger(value)
}

export function StationDetailTable({ rows }: { rows: StationDetailRow[] }) {
  // Starts with the lowest uptime on top, so the stations that need attention come first.
  const [sortKey, setSortKey] = useState<SortKey>("rate")
  const [direction, setDirection] = useState<SortDirection>("asc")

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setDirection("asc")
    }
  }

  const sortedRows = sortRows(rows, sortKey, direction)

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        Sorted by {describeSort(sortKey, direction)}. Click a column heading to sort
        by it, and click again to reverse the order.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => {
              const isActive = column.key === sortKey
              const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown
              return (
                <TableHead
                  key={column.key}
                  className={column.align === "right" ? "text-right" : undefined}
                  aria-sort={
                    isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`inline-flex items-center gap-1 rounded-sm hover:text-foreground ${
                      isActive ? "text-foreground" : ""
                    }`}
                  >
                    {column.label}
                    <Icon className={`size-3.5 ${isActive ? "" : "opacity-40"}`} />
                  </button>
                </TableHead>
              )
            })}
            <TableHead>Data used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => {
            const tone = getUptimeTone(row.rate)
            const toneColor = tone ? UPTIME_TONE_COLORS[tone] : undefined
            return (
              <TableRow key={row.station}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.rate ?? 0}%`, backgroundColor: toneColor }}
                      />
                    </div>
                    <span
                      className={`w-14 text-right tabular-nums ${
                        tone === "critical" ? "font-semibold" : ""
                      }`}
                      style={tone === "critical" ? { color: toneColor } : undefined}
                    >
                      {row.rate === null ? "--" : formatPercent(row.rate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.upHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {showHours(row.idleHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {showHours(row.downHours)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(row.closedDays)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.sources.map((source) => (
                      <StatusBadge key={source}>{source}</StatusBadge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}