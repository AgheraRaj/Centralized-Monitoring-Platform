"use client"

import { Download, Loader2 } from "lucide-react"
import { useRef, useState } from "react"

import { useExportTable } from "@/components/export/chart-export-provider"
import { Button } from "@/components/ui/button"
import { getExportContext } from "@/lib/export/export-context"

type ChartDownloadButtonProps = {
  title: string
  description?: string
  // A headline line printed under the title, for example "Uptime: 91.8%".
  summary?: string
}

type DownloadState = "idle" | "busy" | "error"

// Sits in the header of a card. Downloads a PDF with the card's graph on top and the
// table of its values below. Shows nothing when the card has no graph.
export function ChartDownloadButton({ title, description, summary }: ChartDownloadButtonProps) {
  const table = useExportTable()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState<DownloadState>("idle")

  if (!table) return null

  async function handleDownload() {
    const card = buttonRef.current?.closest("section")
    // Graphs that are not drawn by the chart library mark themselves with data-export-target.
    const graph =
      card?.querySelector<HTMLElement>("[data-export-target]") ??
      card?.querySelector<HTMLElement>('[data-slot="chart"]')
    if (!graph || !table) {
      setState("error")
      return
    }

    setState("busy")
    try {
      // The PDF code is large, so it is only loaded when someone actually downloads.
      const { downloadChartPdf } = await import("@/lib/download-chart-pdf")
      await downloadChartPdf({
        element: graph,
        title,
        description,
        summary,
        context: getExportContext(),
        table,
      })
      setState("idle")
    } catch (error) {
      console.error("Could not create the PDF", error)
      setState("error")
      window.setTimeout(() => setState("idle"), 4000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "error" && (
        <span role="alert" className="text-xs text-destructive">
          Download failed
        </span>
      )}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={handleDownload}
        disabled={state === "busy"}
        aria-busy={state === "busy"}
        aria-label={`Download ${title} as PDF`}
        title="Download graph and values as PDF"
      >
        {state === "busy" ? <Loader2 className="animate-spin" /> : <Download />}
      </Button>
    </div>
  )
}
