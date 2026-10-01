// Must stay the first import so DATABASE_URL is loaded before the client is created.
import "dotenv/config"

import { prisma } from "../lib/prisma"

// Run after importing new readings so the dashboards see them.
// Only the derived views are refreshed. Your readings tables are never changed.
async function main() {
  // Order matters: mv_station_hours is built from mv_dispenser_fills.
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_dispenser_fills`
  console.log("Refreshed mv_dispenser_fills")

  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_station_hours`
  console.log("Refreshed mv_station_hours")

  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_power_outages`
    console.log("Refreshed mv_power_outages")
}

main().finally(() => prisma.$disconnect())