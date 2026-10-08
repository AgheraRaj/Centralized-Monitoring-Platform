"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

import type { ExportTable } from "@/lib/export/chart-table"

// A card (DashboardPanel or HeroPanel) wraps itself in this provider. A chart inside the
// card hands over its table of values with useChartExport. The Download button in the
// card header only appears once a chart has done that, so cards without a chart get no button.
//
// Two separate contexts keep the chart from re-rendering when the table is stored:
// the chart only needs the (never changing) setter, only the button reads the table.

const TableContext = createContext<ExportTable | null>(null)
const RegisterContext = createContext<Dispatch<SetStateAction<ExportTable | null>> | null>(null)

export function ChartExportProvider({ children }: { children: ReactNode }) {
  const [table, setTable] = useState<ExportTable | null>(null)

  return (
    <RegisterContext.Provider value={setTable}>
      <TableContext.Provider value={table}>{children}</TableContext.Provider>
    </RegisterContext.Provider>
  )
}

// Call this in a chart with a memoised table. Outside a card it does nothing.
// If a card holds two charts, the last one to register is the one that downloads.
export function useChartExport(table: ExportTable | null) {
  const register = useContext(RegisterContext)

  useEffect(() => {
    if (!register) return
    register(table)
    return () => register(null)
  }, [register, table])
}

// For graphs that are drawn on the server (the heatmap and the gauge).
export function ChartExportData({ table }: { table: ExportTable }) {
  useChartExport(table)
  return null
}

export function useExportTable() {
  return useContext(TableContext)
}
