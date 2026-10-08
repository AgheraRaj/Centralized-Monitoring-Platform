import type { ExportTable } from "@/lib/export/chart-table"

// Browser only. Builds a PDF with the graph as a picture on top and the table of its
// values below, then downloads it. Loaded on demand by the Download button.

type DownloadChartPdfOptions = {
  // The graph to take a picture of.
  element: HTMLElement
  title: string
  description?: string
  summary?: string
  context: string | null
  table: ExportTable
}

const MARGIN_MM = 14
const MAX_IMAGE_HEIGHT_MM = 105
const PX_TO_MM = 25.4 / 96
// Small graphs (a donut) are not stretched to the full page width.
const MAX_ENLARGE = 1.5
// More columns than this are printed on a landscape page.
const MAX_PORTRAIT_COLUMNS = 8

// The PDF font only knows basic Latin letters, so other characters are swapped.
function toPdfText(text: string) {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2192/g, "->")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?")
}

function toFileName(parts: (string | null)[]) {
  const slug = parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
  return `${slug || "chart"}.pdf`
}

export async function downloadChartPdf(options: DownloadChartPdfOptions) {
  const { element, title, description, summary, context, table } = options

  const [{ toPng }, { jsPDF }, { default: autoTable }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  // ---- the picture of the graph (transparent, so the PDF can draw its own backdrop)
  const bounds = element.getBoundingClientRect()
  const pixelRatio = Math.min(4, Math.max(2, 1400 / Math.max(bounds.width, 1)))
  const imageData = await toPng(element, { pixelRatio, cacheBust: true })
  const isDarkTheme = document.documentElement.classList.contains("dark")

  // ---- the document
  const landscape = table.columns.length > MAX_PORTRAIT_COLUMNS
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN_MM * 2

  let y = 16
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.setTextColor(120)
  pdf.text("CMP  |  Centralized Monitoring Platform", MARGIN_MM, y)

  y += 8
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(16)
  pdf.setTextColor(20)
  pdf.text(toPdfText(title), MARGIN_MM, y)

  pdf.setFont("helvetica", "normal")
  if (context) {
    y += 6
    pdf.setFontSize(9.5)
    pdf.setTextColor(60)
    pdf.text(toPdfText(context), MARGIN_MM, y)
  }
  if (summary) {
    y += 5.5
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(10)
    pdf.setTextColor(30)
    pdf.text(toPdfText(summary), MARGIN_MM, y)
    pdf.setFont("helvetica", "normal")
  }
  if (description) {
    y += 5
    pdf.setFontSize(8.5)
    pdf.setTextColor(110)
    const lines: string[] = pdf.splitTextToSize(toPdfText(description), contentWidth)
    pdf.text(lines, MARGIN_MM, y)
    y += (lines.length - 1) * 3.8
  }
  y += 6

  // ---- the graph, on a backdrop that matches the theme it was taken in
  let imageWidth = Math.min(contentWidth, bounds.width * PX_TO_MM * MAX_ENLARGE)
  let imageHeight = imageWidth * (bounds.height / Math.max(bounds.width, 1))
  if (imageHeight > MAX_IMAGE_HEIGHT_MM) {
    imageWidth *= MAX_IMAGE_HEIGHT_MM / imageHeight
    imageHeight = MAX_IMAGE_HEIGHT_MM
  }
  const padding = 3
  if (y + imageHeight + padding * 2 > pageHeight - 20) {
    pdf.addPage()
    y = 16
  }
  const imageX = MARGIN_MM + (contentWidth - imageWidth) / 2
  if (isDarkTheme) {
    pdf.setFillColor(24, 24, 27)
  } else {
    pdf.setFillColor(246, 246, 247)
  }
  pdf.roundedRect(imageX - padding, y - padding, imageWidth + padding * 2, imageHeight + padding * 2, 2, 2, "F")
  pdf.addImage(imageData, "PNG", imageX, y, imageWidth, imageHeight, undefined, "FAST")
  y += imageHeight + padding * 2 + 5

  // ---- the table of values
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(10)
  pdf.setTextColor(30)
  pdf.text("Values", MARGIN_MM, y)

  autoTable(pdf, {
    startY: y + 2,
    head: [table.columns.map((column) => toPdfText(column.label))],
    body: table.rows.map((row) => row.map(toPdfText)),
    foot: table.footer ? [table.footer.map(toPdfText)] : undefined,
    showFoot: "lastPage",
    margin: { left: MARGIN_MM, right: MARGIN_MM, bottom: 16 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 1.8,
      lineColor: [226, 226, 230],
      lineWidth: 0.1,
      textColor: [30, 30, 35],
    },
    headStyles: { fillColor: [38, 54, 92], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [236, 238, 243], textColor: [20, 20, 25], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 249, 251] },
    didParseCell: (hook) => {
      if (table.columns[hook.column.index]?.align === "right") hook.cell.styles.halign = "right"
    },
  })

  if (table.notes && table.notes.length > 0) {
    const { finalY } = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(110)
    let noteY = finalY + 5
    for (const note of table.notes) {
      if (noteY > pageHeight - 18) {
        pdf.addPage()
        noteY = 16
      }
      pdf.text(toPdfText(note), MARGIN_MM, noteY)
      noteY += 4
    }
  }

  // ---- page footer on every page
  const pageCount = pdf.getNumberOfPages()
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(7.5)
    pdf.setTextColor(140)
    pdf.text(`Generated ${toPdfText(generated)}`, MARGIN_MM, pageHeight - 8)
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN_MM, pageHeight - 8, { align: "right" })
  }

  pdf.save(toFileName([title, context]))
}
