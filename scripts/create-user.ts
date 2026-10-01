// Must stay the first import so env variables are loaded before the client is created.
import "dotenv/config"

import { randomUUID } from "node:crypto"

import { hashPassword } from "better-auth/crypto"

import { prisma } from "../lib/prisma"

const MINIMUM_PASSWORD_LENGTH = 8

async function main() {
  const [name, rawEmail, password] = process.argv.slice(2)

  if (!name || !rawEmail || !password) {
    console.error('Usage: npm run user:create -- "Full Name" email@example.com password')
    process.exit(1)
  }
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`)
    process.exit(1)
  }

  // Better Auth compares lowercase emails at sign-in.
  const email = rawEmail.toLowerCase()

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    console.log(`User ${email} already exists. Nothing changed.`)
    return
  }

  const userId = randomUUID()
  const now = new Date()

  // Better Auth keeps the password hash in the account table (providerId "credential").
  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, name, email, emailVerified: true, createdAt: now, updatedAt: now },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      },
    }),
  ])

  console.log(`Created user ${email}`)
}

main().finally(() => prisma.$disconnect())