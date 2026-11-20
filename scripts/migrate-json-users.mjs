/* One-time migration: copies local JSON-store accounts into Neon (insert-only,
   skips emails that already exist). Password hashes are copied verbatim, so
   existing logins keep working. */
import { neon } from "@neondatabase/serverless"
import fs from "node:fs"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "").trim()]),
)
const sql = neon(env.DATABASE_URL)

const local = JSON.parse(fs.readFileSync("src/data/users.json", "utf8"))
const existing = await sql`SELECT email FROM users`
const have = new Set(existing.map((r) => r.email))

let migrated = 0, skipped = 0
for (const u of local) {
  if (!u?.email || !u?.passwordHash) { skipped++; continue }
  if (have.has(u.email)) { skipped++; continue }
  await sql`INSERT INTO users (id, email, name, password_hash, keeta_address, image_url, bio, location, website, twitter, favorite_strategies, created_at)
    VALUES (${u.id}, ${u.email}, ${u.name ?? null}, ${u.passwordHash}, ${u.keetaAddress ?? null}, ${u.imageUrl ?? null}, ${u.bio ?? null}, ${u.location ?? null}, ${u.website ?? null}, ${u.twitter ?? null}, ${JSON.stringify(u.favoriteStrategies ?? [])}, ${u.createdAt ?? new Date().toISOString()})
    ON CONFLICT (email) DO NOTHING`
  migrated++
  console.log("migrated", u.email)
}
console.log(`done: ${migrated} migrated, ${skipped} skipped (already in Neon or no password)`)
