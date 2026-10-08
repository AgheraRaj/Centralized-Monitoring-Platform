"use client"

import { useEffect } from "react"

import { setExportContext } from "@/lib/export/export-context"

// Renders nothing. Tells the Download buttons on this page which station and dates to print.
export function ExportContextSetter({ context }: { context: string }) {
  useEffect(() => {
    setExportContext(context)
    return () => setExportContext(null)
  }, [context])

  return null
}