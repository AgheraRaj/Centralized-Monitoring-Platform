"use client"

import "leaflet/dist/leaflet.css"

import type { Map as LeafletMap, Marker, TileLayer } from "leaflet"
import { useEffect, useRef, useState } from "react"

import { DashboardPanel } from "@/components/dashboard-panel"
import { StationDrawer } from "@/components/map/station-drawer"
import {
  formatRate,
  type StationMapData,
  type StationStatus,
} from "@/components/map/types"
import { StatusBadge } from "@/components/overview/status-badge"
import { formatDecimal } from "@/lib/format"

type StationMapProps = {
  stations: StationMapData[]
  statusColors: Record<StationStatus, string>
}

// Free OpenStreetMap tiles (no API key). Dark mode darkens the same tiles with a
// CSS filter instead of using a second tile server.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Styles for the markers and the hover popup. They use the theme variables, so
// they follow light and dark mode. isolate on the map wrapper keeps Leaflet's
// own z-index values below the sidebar and the drawer.
const MAP_CSS = `
.station-pin{position:relative;display:block;width:22px;height:22px}
.station-pin-dot{position:absolute;inset:4px;border-radius:9999px;background:var(--pin);border:2px solid var(--background);box-shadow:0 1px 4px rgb(0 0 0/.45);transition:transform .15s}
.station-pin::before{content:"";position:absolute;inset:0;border-radius:9999px;background:var(--pin);opacity:.3}
.station-pin:hover .station-pin-dot,.station-pin.is-selected .station-pin-dot{transform:scale(1.3)}
.station-pin.is-selected::before{opacity:.5}
.leaflet-tooltip.station-tooltip{padding:0;border:1px solid var(--border);border-radius:10px;background:var(--popover);color:var(--popover-foreground);box-shadow:0 8px 24px rgb(0 0 0/.25);font:inherit;white-space:normal}
.leaflet-tooltip-top.station-tooltip::before{border-top-color:var(--border)}
.dark .map-tiles-dark{filter:invert(1) hue-rotate(180deg) brightness(.95) contrast(.9) saturate(.7)}
.leaflet-container{font:inherit;background:var(--muted)}
.leaflet-container a{color:inherit}
.leaflet-control-attribution{background:color-mix(in oklch,var(--background) 75%,transparent)!important;color:var(--muted-foreground)}
.leaflet-bar a{background:var(--popover);color:var(--popover-foreground);border-color:var(--border)}
.leaflet-bar a:hover{background:var(--accent)}
`

function tooltipHtml(station: StationMapData, color: string) {
  const row = (label: string, value: string) =>
    `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px"><span style="color:var(--muted-foreground)">${label}</span><span style="font-weight:500">${value}</span></div>`

  return `<div style="min-width:190px;padding:10px 12px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="width:8px;height:8px;border-radius:9999px;background:${color}"></span>
      <strong style="font-size:13px">${station.name}</strong>
    </div>
    <div style="display:grid;gap:3px">
      ${row("Status", station.statusLabel)}
      ${row("Uptime", station.uptime === null ? "--" : `${formatDecimal(station.uptime)}%`)}
      ${row("Unit rate", formatRate(station.unitRate === null ? null : station.unitRate))}
    </div>
    <div style="margin-top:6px;font-size:11px;color:var(--muted-foreground)">Click for full details</div>
  </div>`
}

export function StationMap({ stations, statusColors }: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  // Create the map once. Leaflet needs the browser, so it is loaded here.
  useEffect(() => {
    let cancelled = false
    let created: LeafletMap | null = null
    let observer: ResizeObserver | null = null
    const markers = markersRef.current

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return
      leafletRef.current = L

      created = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true })

      for (const station of stations) {
        const color = statusColors[station.status]
        const marker = L.marker([station.latitude, station.longitude], {
          icon: L.divIcon({
            className: "",
            html: `<span class="station-pin" style="--pin:${color}"><span class="station-pin-dot"></span></span>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          title: station.name,
          keyboard: true,
        }).addTo(created)

        marker.bindTooltip(tooltipHtml(station, color), {
          direction: "top",
          offset: [0, -12],
          className: "station-tooltip",
          opacity: 1,
        })
        marker.on("click", () => setSelectedCode(station.code))
        markers.set(station.code, marker)
      }

      created.fitBounds(
        L.latLngBounds(stations.map((s) => [s.latitude, s.longitude] as [number, number])),
        { padding: [60, 60], maxZoom: 12 }
      )

      // Keep the map correct when the sidebar opens or the window is resized.
      observer = new ResizeObserver(() => created?.invalidateSize())
      observer.observe(containerRef.current)
      setMap(created)
    }

    init()

    return () => {
      cancelled = true
      observer?.disconnect()
      markers.clear()
      created?.remove()
      tileRef.current = null
      setMap(null)
    }
  }, [stations, statusColors])

  // Swap the map tiles when the theme changes.
  useEffect(() => {
    const L = leafletRef.current
    if (!map || !L) return
    tileRef.current?.remove()
    tileRef.current = L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      maxZoom: 19,
      className: "map-tiles-dark",
    }).addTo(map)
  }, [map])

  // Highlight the selected marker.
  useEffect(() => {
    markersRef.current.forEach((marker, code) => {
      marker
        .getElement()
        ?.querySelector(".station-pin")
        ?.classList.toggle("is-selected", code === selectedCode)
    })
  }, [selectedCode, map])

  function focusStation(code: string) {
    const station = stations.find((item) => item.code === code)
    if (station && map) map.flyTo([station.latitude, station.longitude], 13, { duration: 0.8 })
    setSelectedCode(code)
  }

  const selected = stations.find((station) => station.code === selectedCode) ?? null

  return (
    <>
      <style>{MAP_CSS}</style>

      <DashboardPanel
        title="Stations"
        description="Marker colour shows uptime: green healthy, amber low, red critical"
      >
        <div className="relative isolate z-0 h-[60svh] min-h-[360px] overflow-hidden rounded-lg ring-1 ring-foreground/10 lg:h-[calc(100svh-20rem)] lg:min-h-[460px]">
          <div ref={containerRef} className="size-full" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stations.map((station) => (
            <button
              key={station.code}
              type="button"
              onClick={() => focusStation(station.code)}
              className="flex flex-col gap-1.5 rounded-lg border bg-background/60 p-3 text-left transition-colors hover:bg-accent"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[station.status] }}
                  />
                  {station.name}
                </span>
                <StatusBadge
                  tone={
                    station.status === "good"
                      ? "good"
                      : station.status === "nodata"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {station.statusLabel}
                </StatusBadge>
              </span>
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Uptime{" "}
                  <span className="font-medium text-foreground">
                    {station.uptime === null ? "--" : `${formatDecimal(station.uptime)}%`}
                  </span>
                </span>
                <span>
                  Unit rate{" "}
                  <span className="font-medium text-foreground">
                    {formatRate(station.unitRate)}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </DashboardPanel>

      <StationDrawer
        station={selected}
        statusColor={selected ? statusColors[selected.status] : undefined}
        onClose={() => setSelectedCode(null)}
      />
    </>
  )
}