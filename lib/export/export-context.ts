// The line printed under the title of every downloaded PDF, for example
// "All stations · 2 Aug 2026 to 31 Aug 2026". The page header sets it when a page opens,
// and the Download button reads it when it is clicked.

let currentContext: string | null = null

export function setExportContext(context: string | null) {
  currentContext = context
}

export function getExportContext() {
  return currentContext
}