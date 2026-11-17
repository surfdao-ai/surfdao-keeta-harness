import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  serial,
  numeric,
} from "drizzle-orm/pg-core"

/* --------------------------------------------------------------------------
   SurfDAO.ai — Database schema (Drizzle ORM, Postgres/Neon)

   For the MVP the app runs against a zero-config JSON file store (below)
   that mirrors this schema. To migrate to Postgres/Neon, wire up drizzle-orm
   + @neondatabase/serverless against this schema and set DATABASE_URL.
--------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  keetaAddress: text("keeta_address"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const funds = pgTable("funds", {
  id: varchar("id").primaryKey(),
  ownerId: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: ["paper", "live", "paused"] }).notNull().default("paper"),
  mandate: jsonb("mandate").notNull(),
  riskConfig: jsonb("risk_config").notNull(),
  inferenceConfig: jsonb("inference_config").notNull(),
  keetaWalletAddress: text("keeta_wallet_address"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const fundSessions = pgTable("fund_sessions", {
  id: varchar("id").primaryKey(),
  fundId: varchar("fund_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  decisions: jsonb("decisions"),
  checks: jsonb("checks"),
  actions: jsonb("actions"),
  nav: numeric("nav", { precision: 18, scale: 2 }).notNull().default("10000"),
  returnPct: numeric("return_pct", { precision: 10, scale: 4 }),
  status: text("status").notNull().default("completed"),
})

export const allocations = pgTable("allocations", {
  id: varchar("id").primaryKey(),
  fundId: varchar("fund_id").notNull(),
  allocatorUserId: varchar("allocator_user_id").notNull(),
  amountUsdc: numeric("amount_usdc", { precision: 18, scale: 6 }).notNull(),
  keetaTxHash: text("keeta_tx_hash"),
  status: text("status", { enum: ["pending", "active", "withdrawn"] }).notNull().default("active"),
  allocatedAt: timestamp("allocated_at").defaultNow().notNull(),
})

export const performanceSnapshots = pgTable("performance_snapshots", {
  id: serial("id").primaryKey(),
  fundId: varchar("fund_id").notNull(),
  date: timestamp("date").notNull(),
  nav: numeric("nav", { precision: 18, scale: 2 }).notNull(),
  aum: numeric("aum", { precision: 18, scale: 2 }).notNull().default("0"),
  sharpe: numeric("sharpe", { precision: 10, scale: 4 }),
  maxDrawdown: numeric("max_drawdown", { precision: 10, scale: 4 }),
  totalReturn: numeric("total_return", { precision: 10, scale: 4 }),
})

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
})

/* --------------------------------------------------------------------------
   Plain application types (mirror the schema, tuned for the JSON store).
--------------------------------------------------------------------------- */

export type User = {
  id: string
  email: string
  name?: string
  passwordHash?: string
  keetaAddress?: string
  imageUrl?: string
  bio?: string
  location?: string
  website?: string
  twitter?: string
  favoriteStrategies?: string[]
  createdAt: string
}
export type Fund = {
  id: string
  ownerId: string
  name: string
  description: string | null
  slug: string
  status: "paper" | "live" | "paused"
  mandate: unknown
  riskConfig: unknown
  inferenceConfig: unknown
  keetaWalletAddress: string | null
  isPublic: boolean
  createdAt: string
}
export type FundSession = {
  id: string
  fundId: string
  timestamp: string
  decisions: unknown
  checks: unknown
  actions: unknown
  nav: number
  returnPct: number | null
  status: string
}
export type Allocation = {
  id: string
  fundId: string
  allocatorUserId: string
  amountUsdc: number
  keetaTxHash: string | null
  status: "pending" | "active" | "withdrawn"
  allocatedAt: string
}
export type Session = {
  id: string
  userId: string
  token: string
  expiresAt: string
}

/* --------------------------------------------------------------------------
   Zero-config JSON file store (MVP). Swap in Drizzle + Neon for production.
--------------------------------------------------------------------------- */

import fs from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"

const DATA_DIR = path.join(process.cwd(), "src/data")
const FILES = {
  users: "users.json",
  funds: "funds.json",
  sessions: "sessions.json",
  allocations: "allocations.json",
  fundSessions: "fundSessions.json",
} as const

type FileKey = (typeof FILES)[keyof typeof FILES]

/* Global in-memory cache. On Vercel the filesystem is read-only, so writes
   fall back to this per-instance store. Locally, data also persists to disk.
   For durable production data, swap in Drizzle + Neon (see README). */
const mem = ((globalThis as Record<string, unknown>).__surfdao_memstore ??=
  new Map<FileKey, unknown[]>()) as Map<FileKey, unknown[]>

async function readFile<T>(key: FileKey): Promise<T[]> {
  if (mem.has(key)) return mem.get(key) as T[]
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, key), "utf8")
    const parsed = JSON.parse(raw) as T[]
    mem.set(key, parsed)
    return parsed
  } catch {
    mem.set(key, [])
    return []
  }
}

async function writeFile<T>(key: FileKey, data: T[]) {
  mem.set(key, data)
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(path.join(DATA_DIR, key), JSON.stringify(data, null, 2))
  } catch {
    // Vercel read-only filesystem — the in-memory store keeps the app working.
  }
}

/* --------------------------------------------------------------------------
   Per-browser cookie cache. On Vercel each request can hit a different lambda
   with its own in-memory store. Persisting just-created records in a cookie
   makes the create → detail-page hop reliable for the creator.
--------------------------------------------------------------------------- */

const FUND_COOKIE = "surfdao_funds"
const ALLOC_COOKIE = "surfdao_allocs"
const SESSION_COOKIE = "surfdao_sessions"
const USER_COOKIE = "surfdao_user"
const AUTH_SESSION_COOKIE = "surfdao_auth"

async function readCookie<T>(name: string): Promise<T[]> {
  try {
    const jar = await cookies()
    const raw = jar.get(name)?.value
    if (!raw) return []
    const parsed = JSON.parse(decodeURIComponent(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeCookie<T>(name: string, rows: T[]) {
  try {
    const jar = await cookies()
    jar.set(name, encodeURIComponent(JSON.stringify(rows.slice(0, 4))), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch {
    // called outside a request context — ignore
  }
}

export async function rememberFund(fund: Fund) {
  const rows = await readCookie<Fund>(FUND_COOKIE)
  await writeCookie(FUND_COOKIE, [fund, ...rows.filter((f) => f.id !== fund.id)])
}

export async function rememberAllocation(allocation: Allocation) {
  const rows = await readCookie<Allocation>(ALLOC_COOKIE)
  await writeCookie(ALLOC_COOKIE, [allocation, ...rows.filter((a) => a.id !== allocation.id)])
}

export async function rememberSession(session: FundSession) {
  const rows = await readCookie<FundSession>(SESSION_COOKIE)
  await writeCookie(SESSION_COOKIE, [session, ...rows.filter((s) => s.id !== session.id)])
}

export async function rememberUser(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user
  await writeCookie(USER_COOKIE, [safe])
}

export async function rememberAuthSession(session: Session) {
  await writeCookie(AUTH_SESSION_COOKIE, [session])
}

export const store = {
  users: {
    list: async () => {
      const disk = await readFile<User>(FILES.users)
      const cookieUsers = await readCookie<User>(USER_COOKIE)
      const map = new Map(disk.map((u) => [u.id, u]))
      for (const u of cookieUsers) map.set(u.id, { ...map.get(u.id), ...u })
      return [...map.values()]
    },
    findByEmail: async (email: string) => {
      const rows = await store.users.list()
      return rows.find((r) => r.email === email) ?? null
    },
    create: async (user: Omit<User, "id" | "createdAt"> & { id?: string }) => {
      const rows = await store.users.list()
      const row: User = {
        ...user,
        id: user.id ?? crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      rows.push(row)
      await writeFile(FILES.users, rows)
      return row
    },
    update: async (id: string, updates: Partial<Omit<User, "id" | "createdAt">>) => {
      const rows = await readFile<User>(FILES.users)
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) return null
      rows[idx] = { ...rows[idx], ...updates }
      await writeFile(FILES.users, rows)
      // Keep any cookie-mirrored copy in sync for the current browser.
      return rows[idx]
    },
    updateKeetaAddress: async (id: string, keetaAddress: string) => {
      return store.users.update(id, { keetaAddress })
    },
  },
  funds: {
    list: async () => {
      const disk = await readFile<Fund>(FILES.funds)
      const cookieFunds = await readCookie<Fund>(FUND_COOKIE)
      const ids = new Set(disk.map((f) => f.id))
      return [...cookieFunds.filter((f) => !ids.has(f.id)), ...disk]
    },
    findBySlug: async (slug: string) => {
      const rows = await store.funds.list()
      return rows.find((r) => r.slug === slug) ?? null
    },
    findByOwner: async (ownerId: string) => {
      const rows = await store.funds.list()
      return rows.filter((r) => r.ownerId === ownerId)
    },
    create: async (fund: Omit<Fund, "id" | "createdAt"> & { id?: string }) => {
      const rows = await store.funds.list()
      const row: Fund = {
        ...fund,
        id: fund.id ?? crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      rows.push(row)
      await writeFile(FILES.funds, rows)
      return row
    },
  },
  allocations: {
    list: async () => {
      const disk = await readFile<Allocation>(FILES.allocations)
      const cookieAllocs = await readCookie<Allocation>(ALLOC_COOKIE)
      const ids = new Set(disk.map((a) => a.id))
      return [...cookieAllocs.filter((a) => !ids.has(a.id)), ...disk]
    },
    create: async (allocation: Omit<Allocation, "id" | "allocatedAt">) => {
      const rows = await store.allocations.list()
      const row: Allocation = {
        ...allocation,
        id: crypto.randomUUID(),
        allocatedAt: new Date().toISOString(),
      }
      rows.push(row)
      await writeFile(FILES.allocations, rows)
      return row
    },
    byFund: async (fundId: string) => {
      const rows = await store.allocations.list()
      return rows.filter((r) => r.fundId === fundId && (r.status === "active" || r.status === "pending"))
    },
  },
  fundSessions: {
    list: async () => {
      const disk = await readFile<FundSession>(FILES.fundSessions)
      const cookieSessions = await readCookie<FundSession>(SESSION_COOKIE)
      const ids = new Set(disk.map((s) => s.id))
      return [...cookieSessions.filter((s) => !ids.has(s.id)), ...disk]
    },
    byFund: async (fundId: string) => {
      const rows = await store.fundSessions.list()
      return rows.filter((r) => r.fundId === fundId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    },
    create: async (session: Omit<FundSession, "id" | "timestamp">) => {
      const rows = await store.fundSessions.list()
      const row: FundSession = {
        ...session,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      rows.push(row)
      await writeFile(FILES.fundSessions, rows)
      return row
    },
  },
  sessions: {
    list: async () => {
      const disk = await readFile<Session>(FILES.sessions)
      const cookieSessions = await readCookie<Session>(AUTH_SESSION_COOKIE)
      const ids = new Set(disk.map((s) => s.token))
      return [...cookieSessions.filter((s) => !ids.has(s.token)), ...disk]
    },
    findByToken: async (token: string) => {
      const rows = await store.sessions.list()
      return rows.find((r) => r.token === token) ?? null
    },
    create: async (session: { userId: string; token: string; expiresAt: string }) => {
      const rows = await store.sessions.list()
      const row: Session = { ...session, id: crypto.randomUUID() }
      rows.push(row)
      await writeFile(FILES.sessions, rows)
      return row
    },
    delete: async (token: string) => {
      const rows = await store.sessions.list()
      const filtered = rows.filter((r) => r.token !== token)
      await writeFile(FILES.sessions, filtered)
    },
  },
}
