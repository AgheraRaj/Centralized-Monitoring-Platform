"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ALL_STATIONS,
  resolveStationFilter,
  STATION_OPTIONS,
} from "@/lib/stations"

export function StationSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedStation = resolveStationFilter(
    searchParams.get("station") ?? undefined
  )

  function handleStationChange(value: string | null) {
    if (!value) return

    // Keep any other query params (for example a date range added later).
    const params = new URLSearchParams(searchParams.toString())
    if (value === ALL_STATIONS) {
      params.delete("station")
    } else {
      params.set("station", value)
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    // `items` lets the trigger show the station name instead of its raw code.
    <Select
      items={STATION_OPTIONS}
      value={selectedStation}
      onValueChange={handleStationChange}
    >
      <SelectTrigger className="w-40 sm:w-52" aria-label="Station">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {STATION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}