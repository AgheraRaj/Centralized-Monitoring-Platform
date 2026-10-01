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
import { RANGE_PRESETS, resolveRangePreset } from "@/lib/date-range"

const RANGE_OPTIONS = RANGE_PRESETS.map(({ value, label }) => ({ value, label }))

export function RangeSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedRange = resolveRangePreset(searchParams.get("range") ?? undefined)

  function handleRangeChange(value: string | null) {
    if (!value) return

    // Keep the other query params, such as the selected station.
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    // `items` lets the trigger show the label instead of the raw value.
    <Select
      items={RANGE_OPTIONS}
      value={selectedRange}
      onValueChange={handleRangeChange}
    >
      <SelectTrigger className="w-40" aria-label="Date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}