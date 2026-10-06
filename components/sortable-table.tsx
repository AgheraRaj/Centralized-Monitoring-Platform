"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// The server page prepares every cell as text plus a value to sort by, so this
// component stays generic and no functions cross from server to client.
export type SortableColumn = {
  key: string
  label: string
  align?: "left" | "right"
}

export type SortableCell = {
  text: string
  sort: number | string
  // Optional progress bar (0 to 100) drawn beside the text.
  percent?: number
  color?: string
}

export type SortableRow = {
  id: string
  cells: Record<string, SortableCell>
}

type SortState = { key: string; direction: "asc" | "desc" } | null

type SortableTableProps = {
  columns: SortableColumn[]
  rows: SortableRow[]
  emptyMessage?: string
  // Turns on pagination with this many rows per page. Leave out to show all rows.
  pageSize?: number
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

function compare(a: number | string, b: number | string) {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

export function SortableTable({
  columns,
  rows,
  emptyMessage = "No data in this period.",
  pageSize,
}: SortableTableProps) {
  // null keeps the original order from the page.
  const [sort, setSort] = useState<SortState>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize ?? rows.length)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort(
      (a, b) => factor * compare(a.cells[sort.key].sort, b.cells[sort.key].sort)
    )
  }, [rows, sort])

  const isPaginated = pageSize !== undefined
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))
  // Stay on a valid page if the number of rows shrinks.
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const firstRow = currentPage * rowsPerPage
  const visibleRows = isPaginated
    ? sortedRows.slice(firstRow, firstRow + rowsPerPage)
    : sortedRows
  const showControls = isPaginated && rows.length > PAGE_SIZE_OPTIONS[0]

  // First click ascending, second descending, third back to the original order.
  function toggle(key: string) {
    setPageIndex(0)
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" }
      if (current.direction === "asc") return { key, direction: "desc" }
      return null
    })
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const active = sort?.key === column.key
            const Icon =
              !active || !sort
                ? ArrowUpDown
                : sort.direction === "asc"
                  ? ArrowUp
                  : ArrowDown
            const isRight = column.align !== "left"
            return (
              <TableHead
                key={column.key}
                className={isRight ? "text-right" : undefined}
                aria-sort={
                  active && sort
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggle(column.key)}
                  className={`inline-flex items-center gap-1 rounded transition-colors hover:text-foreground ${
                    isRight ? "flex-row-reverse" : ""
                  } ${active ? "text-foreground" : ""}`}
                >
                  {column.label}
                  <Icon className={`size-3.5 ${active ? "" : "opacity-40"}`} />
                </button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
        {visibleRows.map((row) => (
          <TableRow key={row.id}>
            {columns.map((column, index) => {
              const cell = row.cells[column.key]
              const isRight = column.align !== "left"
              return (
                <TableCell
                  key={column.key}
                  className={`${isRight ? "text-right tabular-nums" : ""} ${
                    index === 0 ? "font-medium" : ""
                  }`}
                >
                  {cell.percent === undefined ? (
                    cell.text
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(Math.max(cell.percent, 0), 100)}%`,
                            backgroundColor: cell.color,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right tabular-nums">{cell.text}</span>
                    </div>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {showControls && (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          Showing {firstRow + 1}-{Math.min(firstRow + rowsPerPage, sortedRows.length)} of{" "}
          {sortedRows.length}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value))
                setPageIndex(0)
              }}
              className="h-8 rounded-md border bg-background px-2 text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="tabular-nums">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPageIndex(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPageIndex(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}