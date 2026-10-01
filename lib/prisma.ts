import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../app/generated/prisma/client"

// In development Next.js reloads modules often. Keeping one client on
// globalThis avoids opening a new connection pool on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}