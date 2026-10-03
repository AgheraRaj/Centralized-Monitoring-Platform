const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Average vehicles per weekday, counting only days that had fills so that
// closed days do not pull an average down. `day` is an ISO date (YYYY-MM-DD).
export function buildWeekdayAverages(days: { day: string; vehicles: number }[]) {
  const totals = WEEKDAY_LABELS.map(() => ({ vehicles: 0, activeDays: 0 }))

  for (const { day, vehicles } of days) {
    if (vehicles <= 0) continue

    // getUTCDay() counts from Sunday = 0, so shift it to start the week on Monday.
    const weekdayIndex = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
    totals[weekdayIndex].vehicles += vehicles
    totals[weekdayIndex].activeDays += 1
  }

  return WEEKDAY_LABELS.map((weekday, index) => ({
    weekday,
    averageVehicles:
      totals[index].activeDays > 0
        ? Math.round(totals[index].vehicles / totals[index].activeDays)
        : 0,
  }))
}