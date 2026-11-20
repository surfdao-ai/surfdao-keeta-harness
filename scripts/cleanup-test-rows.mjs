/* One-shot cleanup of test rows created during this session.
   Targets ONLY the exact emails created here — nothing else is touched. */
import { neon } from "@neondatabase/serverless"
import fs from "node:fs"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "").trim()]),
)
const sql = neon(env.DATABASE_URL)
const TEST_EMAILS = ["prodcheck@surfdao.ai", "leakA@test.io", "leakB@test.io"]

const users = await sql`SELECT id, email FROM users WHERE email = ANY(${TEST_EMAILS})`
console.log("test users found:", users.map((u) => u.email))
const ids = users.map((u) => u.id)
if (!ids.length) { console.log("nothing to do"); process.exit(0) }

// Dependents first, then the users themselves (all parameterized).
const fundIdsOwned = (await sql`SELECT id FROM funds WHERE owner_id = ANY(${ids})`).map((f) => f.id)
await sql`DELETE FROM performance_fees WHERE owner_id = ANY(${ids}) OR fund_id = ANY(${fundIdsOwned})`
await sql`DELETE FROM withdrawals WHERE user_id = ANY(${ids}) OR fund_id = ANY(${fundIdsOwned})`
await sql`DELETE FROM fund_sessions WHERE fund_id = ANY(${fundIdsOwned})`
await sql`DELETE FROM allocations WHERE fund_id = ANY(${fundIdsOwned}) OR allocator_user_id = ANY(${ids})`
await sql`DELETE FROM funds WHERE id = ANY(${fundIdsOwned})`
await sql`DELETE FROM auth_sessions WHERE user_id = ANY(${ids})`
await sql`DELETE FROM users WHERE id = ANY(${ids})`
console.log("cleaned test data for", ids.length, "user(s); removed", fundIdsOwned.length, "fund(s)")
