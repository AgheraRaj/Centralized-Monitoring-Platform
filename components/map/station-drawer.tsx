"use client"

import type { ReactNode } from "react"

import { formatRate, type StationMapData } from "@/components/map/types"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDecimal, formatInteger } from "@/lib/format"

type StationDrawerProps = {
  station: StationMapData | null
  statusColor?: string
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}

const percent = (value: number | null) =>
  value === null ? "--" : `${formatDecimal(value)}%`

export function StationDrawer({ station, statusColor, onClose }: StationDrawerProps) {
  return (
    <Sheet open={station !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {station && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                {station.name}
              </SheetTitle>
              <SheetDescription>
                {station.statusLabel} · {station.latitude.toFixed(4)},{" "}
                {station.longitude.toFixed(4)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Uptime" value={percent(station.uptime)} />
                <Stat label="Unit rate" value={formatRate(station.unitRate)} />
                <Stat label="Vehicles served" value={formatInteger(station.vehicles)} />
                <Stat label="Gas dispensed" value={`${formatInteger(station.kg)} kg`} />
              </div>

              <Section title="Station health">
                <div>
                  <Row label="Up hours" value={formatInteger(station.upHours)} />
                  <Row label="Open hours" value={formatInteger(station.openHours)} />
                  <Row
                    label="Down hours"
                    value={station.downHours === null ? "--" : formatInteger(station.downHours)}
                  />
                  <Row
                    label="Idle hours"
                    value={station.idleHours === null ? "--" : formatInteger(station.idleHours)}
                  />
                  <Row label="Closed days" value={formatInteger(station.closedDays)} />
                  <Row
                    label="Compressor signal"
                    value={station.hasCompressorSignal ? "Available" : "None"}
                  />
                  <Row
                    label="Gas flow signal"
                    value={station.hasFlowSignal ? "Available" : "None"}
                  />
                </div>
              </Section>

              <Section title="Unit rate">
                <div>
                  <Row label="Average" value={formatRate(station.unitRate)} />
                  <Row label="Lowest" value={formatRate(station.minRate)} />
                  <Row label="Highest" value={formatRate(station.maxRate)} />
                </div>
              </Section>

              <Section title="Dispensers and capacity">
                <div>
                  <Row label="Dispensers in use" value={formatInteger(station.dispensers)} />
                  <Row
                    label="Rated capacity per dispenser"
                    value={`${formatInteger(station.capacityKgPerHour)} kg/hr`}
                  />
                  <Row
                    label="Rated capacity per day"
                    value={`${formatInteger(station.ratedKgPerDay)} kg`}
                  />
                  <Row label="Utilization" value={percent(station.utilization)} />
                  <Row label="Active days" value={formatInteger(station.activeDays)} />
                  <Row
                    label="Vehicles per active day"
                    value={formatInteger(station.averagePerActiveDay)}
                  />
                  <Row label="Last fill" value={station.lastFillAt ?? "--"} />
                </div>
              </Section>

              <Section title="Dispenser details">
                {station.dispenserRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No dispenser data in this period.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead className="text-right">Fills</TableHead>
                        <TableHead className="text-right">kg</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {station.dispenserRows.map((row) => (
                        <TableRow key={row.serial}>
                          <TableCell className="font-medium">{row.serial}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInteger(row.fills)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInteger(row.kg)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatRate(row.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>

              <Section title="Location">
                <div>
                  <Row label="Latitude" value={station.latitude.toFixed(6)} />
                  <Row label="Longitude" value={station.longitude.toFixed(6)} />
                  <Row label="Coordinate accuracy" value={station.accuracy} />
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}