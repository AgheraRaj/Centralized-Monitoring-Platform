// Must stay the first import so DATABASE_URL is loaded before the client is created.
import "dotenv/config"

import { prisma } from "../lib/prisma"

async function main() {
  const fillsPerStation = await prisma.dispenser_readings.groupBy({
    by: ["station_name"],
    _count: { _all: true },
    orderBy: { station_name: "asc" },
  })

  console.table(
    fillsPerStation.map((row) => ({
      station: row.station_name,
      fills: row._count._all,
    }))
  )
}

main().finally(() => prisma.$disconnect())