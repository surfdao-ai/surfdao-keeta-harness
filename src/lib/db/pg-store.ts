/* --------------------------------------------------------------------------
   Postgres/Neon store. Used automatically when DATABASE_URL is set.
   All tables are created on first use so deployment needs no manual migration.
--------------------------------------------------------------------------- */

import { neon } from "@neondatabase/serverless"

let _sql: any = null
let _ready: Promise<void> | null = null

export function pgEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/** Cheap liveness probe used by /api/health. */
export async function pingDb(): Promise<boolean> {
  try {
    await ensureSchema()
    await sql()`SELECT 1`
    return true
  } catch {
    return false
  }
}

function sql(): any {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!)
  return _sql
}

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, email text UNIQUE NOT NULL, name text,
  password_hash text, keeta_address text, image_url text,
  bio text, location text, website text, twitter text,
  favorite_strategies jsonb, created_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS funds (
  id text PRIMARY KEY, owner_id text NOT NULL, name text NOT NULL,
  description text, slug text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'paper',
  mandate jsonb NOT NULL, risk_config jsonb NOT NULL, inference_config jsonb NOT NULL,
  assets jsonb NOT NULL, keeta_wallet_address text, vault_address text,
  execution_mode text NOT NULL DEFAULT 'paper',
  performance_fee_pct numeric NOT NULL DEFAULT 10, fee_wallet_address text,
  is_public boolean NOT NULL DEFAULT false,
  published_at text, created_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS fund_sessions (
  id text PRIMARY KEY, fund_id text NOT NULL, timestamp text NOT NULL,
  decisions jsonb, checks jsonb, actions jsonb,
  nav numeric NOT NULL DEFAULT 10000, return_pct numeric, status text NOT NULL DEFAULT 'completed'
);
CREATE TABLE IF NOT EXISTS allocations (
  id text PRIMARY KEY, fund_id text NOT NULL, allocator_user_id text NOT NULL,
  allocator_name text, amount_usdc numeric NOT NULL, keeta_tx_hash text,
  status text NOT NULL DEFAULT 'active', allocated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS performance_fees (
  id text PRIMARY KEY, fund_id text NOT NULL, owner_id text NOT NULL,
  session_id text NOT NULL, wallet_address text NOT NULL, fee_usdc numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', created_at text NOT NULL,
  paid_at text, tx_hash text
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id text PRIMARY KEY, fund_id text NOT NULL, user_id text NOT NULL, user_name text,
  keeta_address text NOT NULL, amount_usdc numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', requested_at text NOT NULL,
  processed_at text, tx_hash text, note text
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY, user_id text NOT NULL, token text UNIQUE NOT NULL, expires_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fund_sessions_fund ON fund_sessions(fund_id);
CREATE INDEX IF NOT EXISTS idx_allocations_fund ON allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
`

export async function ensureSchema(): Promise<void> {
  if (!pgEnabled()) return
  if (!_ready) {
    _ready = (async () => {
      for (const statement of DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
        await sql().query(statement)
      }
      // Additive migrations for databases created before newer fields existed.
      const migrations = [
        "ALTER TABLE funds ADD COLUMN IF NOT EXISTS performance_fee_pct numeric NOT NULL DEFAULT 10",
        "ALTER TABLE funds ADD COLUMN IF NOT EXISTS fee_wallet_address text",
        "ALTER TABLE funds ADD COLUMN IF NOT EXISTS vault_address text",
        "ALTER TABLE funds ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'paper'",
        "ALTER TABLE allocations ADD COLUMN IF NOT EXISTS allocator_name text",
      ]
      for (const m of migrations) {
        try { await sql().query(m) } catch { /* column already compatible */ }
      }
    })().catch((e) => { _ready = null; throw e })
  }
  await _ready
}

const num = (v: any) => (v == null ? 0 : Number(v))

export const pgStore = {
  users: {
    list: async () => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM users ORDER BY created_at DESC`
      return rows.map(userRow)
    },
    findByEmail: async (email: string) => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM users WHERE email = ${email} LIMIT 1`
      return rows[0] ? userRow(rows[0]) : null
    },
    create: async (u: any) => {
      await ensureSchema()
      const row = { ...u, id: u.id ?? crypto.randomUUID(), created_at: new Date().toISOString() }
      await sql()`INSERT INTO users (id,email,name,password_hash,keeta_address,image_url,bio,location,website,twitter,favorite_strategies,created_at)
        VALUES (${row.id},${row.email},${row.name ?? null},${row.passwordHash ?? null},${row.keetaAddress ?? null},${row.imageUrl ?? null},${row.bio ?? null},${row.location ?? null},${row.website ?? null},${row.twitter ?? null},${JSON.stringify(row.favoriteStrategies ?? [])},${row.created_at})`
      const rows = await sql()`SELECT * FROM users WHERE id = ${row.id} LIMIT 1`
      return userRow(rows[0])
    },
    update: async (id: string, updates: any) => {
      await ensureSchema()
      const map: Record<string, string> = {
        name: "name", bio: "bio", location: "location", website: "website",
        twitter: "twitter", keetaAddress: "keeta_address", imageUrl: "image_url",
        passwordHash: "password_hash", favoriteStrategies: "favorite_strategies",
      }
      for (const [k, col] of Object.entries(map)) {
        if (k in updates) {
          const value = k === "favoriteStrategies" ? JSON.stringify(updates[k]) : updates[k]
          await sql().query(`UPDATE users SET ${col} = $1 WHERE id = $2`, [value, id])
        }
      }
      const rows = await sql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`
      return rows[0] ? userRow(rows[0]) : null
    },
  },
  funds: {
    list: async () => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM funds ORDER BY created_at DESC`
      return rows.map(fundRow)
    },
    findBySlug: async (slug: string) => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM funds WHERE slug = ${slug} LIMIT 1`
      return rows[0] ? fundRow(rows[0]) : null
    },
    findByOwner: async (ownerId: string) => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM funds WHERE owner_id = ${ownerId} ORDER BY created_at DESC`
      return rows.map(fundRow)
    },
    create: async (f: any) => {
      await ensureSchema()
      const row = { ...f, id: f.id ?? crypto.randomUUID(), created_at: new Date().toISOString() }
      await sql()`INSERT INTO funds (id,owner_id,name,description,slug,status,mandate,risk_config,inference_config,assets,keeta_wallet_address,vault_address,execution_mode,performance_fee_pct,fee_wallet_address,is_public,published_at,created_at)
        VALUES (${row.id},${row.ownerId},${row.name},${row.description},${row.slug},${row.status},${JSON.stringify(row.mandate)},${JSON.stringify(row.riskConfig)},${JSON.stringify(row.inferenceConfig)},${JSON.stringify(row.assets)},${row.keetaWalletAddress ?? null},${row.vaultAddress ?? null},${row.executionMode ?? "paper"},${row.performanceFeePct ?? 10},${row.feeWalletAddress ?? null},${row.isPublic ?? false},${row.publishedAt ?? null},${row.created_at})`
      const rows = await sql()`SELECT * FROM funds WHERE id = ${row.id} LIMIT 1`
      return fundRow(rows[0])
    },
    update: async (id: string, updates: any) => {
      await ensureSchema()
      const map: Record<string, string> = {
        isPublic: "is_public", publishedAt: "published_at", vaultAddress: "vault_address",
        executionMode: "execution_mode", keetaWalletAddress: "keeta_wallet_address",
        performanceFeePct: "performance_fee_pct", feeWalletAddress: "fee_wallet_address",
        status: "status", name: "name", description: "description", assets: "assets",
        mandate: "mandate", riskConfig: "risk_config", inferenceConfig: "inference_config",
      }
      for (const [k, col] of Object.entries(map)) {
        if (k in updates) {
          const value = ["assets", "mandate", "riskConfig", "inferenceConfig"].includes(k)
            ? JSON.stringify(updates[k]) : updates[k]
          await sql().query(`UPDATE funds SET ${col} = $1 WHERE id = $2`, [value, id])
        }
      }
      const rows = await sql()`SELECT * FROM funds WHERE id = ${id} LIMIT 1`
      return rows[0] ? fundRow(rows[0]) : null
    },
  },
  allocations: {
    list: async () => {
      await ensureSchema()
      return (await sql()`SELECT * FROM allocations ORDER BY allocated_at DESC`).map(allocRow)
    },
    byFund: async (fundId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM allocations WHERE fund_id = ${fundId} AND status IN ('active','pending') ORDER BY allocated_at DESC`).map(allocRow)
    },
    create: async (a: any) => {
      await ensureSchema()
      const row = { ...a, id: crypto.randomUUID(), allocated_at: new Date().toISOString() }
      await sql()`INSERT INTO allocations (id,fund_id,allocator_user_id,allocator_name,amount_usdc,keeta_tx_hash,status,allocated_at)
        VALUES (${row.id},${row.fundId},${row.allocatorUserId},${row.allocatorName ?? null},${row.amountUsdc},${row.keetaTxHash ?? null},${row.status},${row.allocated_at})`
      const rows = await sql()`SELECT * FROM allocations WHERE id = ${row.id} LIMIT 1`
      return allocRow(rows[0])
    },
    update: async (id: string, updates: any) => {
      await ensureSchema()
      if ("status" in updates) await sql()`UPDATE allocations SET status = ${updates.status} WHERE id = ${id}`
      const rows = await sql()`SELECT * FROM allocations WHERE id = ${id} LIMIT 1`
      return rows[0] ? allocRow(rows[0]) : null
    },
  },
  fundSessions: {
    list: async () => {
      await ensureSchema()
      return (await sql()`SELECT * FROM fund_sessions ORDER BY timestamp DESC`).map(sessionRow)
    },
    byFund: async (fundId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM fund_sessions WHERE fund_id = ${fundId} ORDER BY timestamp DESC`).map(sessionRow)
    },
    create: async (s: any) => {
      await ensureSchema()
      const row = { ...s, id: crypto.randomUUID(), timestamp: new Date().toISOString() }
      await sql()`INSERT INTO fund_sessions (id,fund_id,timestamp,decisions,checks,actions,nav,return_pct,status)
        VALUES (${row.id},${row.fundId},${row.timestamp},${JSON.stringify(row.decisions)},${JSON.stringify(row.checks)},${JSON.stringify(row.actions)},${row.nav},${row.returnPct},${row.status})`
      const rows = await sql()`SELECT * FROM fund_sessions WHERE id = ${row.id} LIMIT 1`
      return sessionRow(rows[0])
    },
  },
  withdrawals: {
    list: async () => {
      await ensureSchema()
      return (await sql()`SELECT * FROM withdrawals ORDER BY requested_at DESC`).map(withdrawalRow)
    },
    byUser: async (userId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM withdrawals WHERE user_id = ${userId} ORDER BY requested_at DESC`).map(withdrawalRow)
    },
    byFund: async (fundId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM withdrawals WHERE fund_id = ${fundId} ORDER BY requested_at DESC`).map(withdrawalRow)
    },
    create: async (w: any) => {
      await ensureSchema()
      const row = { ...w, id: crypto.randomUUID(), requested_at: new Date().toISOString() }
      await sql()`INSERT INTO withdrawals (id,fund_id,user_id,user_name,keeta_address,amount_usdc,status,requested_at,processed_at,tx_hash,note)
        VALUES (${row.id},${row.fundId},${row.userId},${row.userName},${row.keetaAddress},${row.amountUsdc},${row.status},${row.requested_at},${row.processedAt ?? null},${row.txHash ?? null},${row.note ?? null})`
      const rows = await sql()`SELECT * FROM withdrawals WHERE id = ${row.id} LIMIT 1`
      return withdrawalRow(rows[0])
    },
    update: async (id: string, updates: any) => {
      await ensureSchema()
      const map: Record<string, string> = {
        status: "status", processedAt: "processed_at", txHash: "tx_hash", note: "note",
      }
      for (const [k, col] of Object.entries(map)) {
        if (k in updates) await sql().query(`UPDATE withdrawals SET ${col} = $1 WHERE id = $2`, [updates[k], id])
      }
      const rows = await sql()`SELECT * FROM withdrawals WHERE id = ${id} LIMIT 1`
      return rows[0] ? withdrawalRow(rows[0]) : null
    },
  },
  fees: {
    list: async () => {
      await ensureSchema()
      return (await sql()`SELECT * FROM performance_fees ORDER BY created_at DESC`).map(feeRow)
    },
    byOwner: async (ownerId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM performance_fees WHERE owner_id = ${ownerId} ORDER BY created_at DESC`).map(feeRow)
    },
    byFund: async (fundId: string) => {
      await ensureSchema()
      return (await sql()`SELECT * FROM performance_fees WHERE fund_id = ${fundId} ORDER BY created_at DESC`).map(feeRow)
    },
    create: async (f: any) => {
      await ensureSchema()
      const row = { ...f, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      await sql()`INSERT INTO performance_fees (id,fund_id,owner_id,session_id,wallet_address,fee_usdc,status,created_at,paid_at,tx_hash)
        VALUES (${row.id},${row.fundId},${row.ownerId},${row.sessionId},${row.walletAddress},${row.feeUsdc},${row.status},${row.created_at},${row.paidAt ?? null},${row.txHash ?? null})`
      const rows = await sql()`SELECT * FROM performance_fees WHERE id = ${row.id} LIMIT 1`
      return feeRow(rows[0])
    },
    update: async (id: string, updates: any) => {
      await ensureSchema()
      const map: Record<string, string> = { status: "status", paidAt: "paid_at", txHash: "tx_hash" }
      for (const [k, col] of Object.entries(map)) {
        if (k in updates) await sql().query(`UPDATE performance_fees SET ${col} = $1 WHERE id = $2`, [updates[k], id])
      }
      const rows = await sql()`SELECT * FROM performance_fees WHERE id = ${id} LIMIT 1`
      return rows[0] ? feeRow(rows[0]) : null
    },
  },
  sessions: {
    list: async () => {
      await ensureSchema()
      return (await sql()`SELECT * FROM auth_sessions ORDER BY expires_at DESC`).map(authSessionRow)
    },
    findByToken: async (token: string) => {
      await ensureSchema()
      const rows = await sql()`SELECT * FROM auth_sessions WHERE token = ${token} LIMIT 1`
      return rows[0] ? authSessionRow(rows[0]) : null
    },
    create: async (s: any) => {
      await ensureSchema()
      const row = { ...s, id: crypto.randomUUID() }
      await sql()`INSERT INTO auth_sessions (id,user_id,token,expires_at) VALUES (${row.id},${row.userId},${row.token},${row.expiresAt})`
      const rows = await sql()`SELECT * FROM auth_sessions WHERE id = ${row.id} LIMIT 1`
      return authSessionRow(rows[0])
    },
    delete: async (token: string) => {
      await ensureSchema()
      await sql()`DELETE FROM auth_sessions WHERE token = ${token}`
    },
  },
}

function userRow(r: any) {
  return {
    id: r.id, email: r.email, name: r.name ?? undefined,
    passwordHash: r.password_hash ?? undefined, keetaAddress: r.keeta_address ?? undefined,
    imageUrl: r.image_url ?? undefined, bio: r.bio ?? undefined, location: r.location ?? undefined,
    website: r.website ?? undefined, twitter: r.twitter ?? undefined,
    favoriteStrategies: typeof r.favorite_strategies === "string" ? JSON.parse(r.favorite_strategies) : (r.favorite_strategies ?? []),
    createdAt: r.created_at,
  }
}
function fundRow(r: any) {
  const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v
  return {
    id: r.id, ownerId: r.owner_id, name: r.name, description: r.description, slug: r.slug,
    status: r.status, mandate: parse(r.mandate), riskConfig: parse(r.risk_config),
    inferenceConfig: parse(r.inference_config), assets: parse(r.assets) ?? [],
    keetaWalletAddress: r.keeta_wallet_address, vaultAddress: r.vault_address,
    executionMode: r.execution_mode ?? "paper",
    performanceFeePct: r.performance_fee_pct == null ? 10 : Number(r.performance_fee_pct),
    feeWalletAddress: r.fee_wallet_address,
    isPublic: r.is_public, publishedAt: r.published_at, createdAt: r.created_at,
  }
}
function allocRow(r: any) {
  return {
    id: r.id, fundId: r.fund_id, allocatorUserId: r.allocator_user_id,
    allocatorName: r.allocator_name, amountUsdc: num(r.amount_usdc),
    keetaTxHash: r.keeta_tx_hash, status: r.status, allocatedAt: r.allocated_at,
  }
}
function sessionRow(r: any) {
  const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v
  return {
    id: r.id, fundId: r.fund_id, timestamp: r.timestamp,
    decisions: parse(r.decisions), checks: parse(r.checks), actions: parse(r.actions),
    nav: num(r.nav), returnPct: r.return_pct == null ? null : num(r.return_pct), status: r.status,
  }
}
function withdrawalRow(r: any) {
  return {
    id: r.id, fundId: r.fund_id, userId: r.user_id, userName: r.user_name,
    keetaAddress: r.keeta_address, amountUsdc: num(r.amount_usdc), status: r.status,
    requestedAt: r.requested_at, processedAt: r.processed_at, txHash: r.tx_hash, note: r.note,
  }
}
function feeRow(r: any) {
  return {
    id: r.id, fundId: r.fund_id, ownerId: r.owner_id, sessionId: r.session_id,
    walletAddress: r.wallet_address, feeUsdc: num(r.fee_usdc), status: r.status,
    createdAt: r.created_at, paidAt: r.paid_at, txHash: r.tx_hash,
  }
}
function authSessionRow(r: any) {
  return { id: r.id, userId: r.user_id, token: r.token, expiresAt: r.expires_at }
}
