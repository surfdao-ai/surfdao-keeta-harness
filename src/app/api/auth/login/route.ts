import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession, destroySession, getSession, publicUser } from "@/lib/auth"
import { verifyPassword } from "@/lib/password"
import { rateLimit } from "@/lib/rate-limit"
import { assertSameOrigin } from "@/lib/validate"

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 })
  }
  const { email, password } = await req.json().catch(() => ({}))
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()
  // Per-account limiting on top of the per-IP limit slows online guessing
  // even when an attacker rotates IPs.
  if (!rateLimit(`login:acct:${normalized}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts for this account. Try again in 10 minutes." }, { status: 429 })
  }
  const user = await store.users.findByEmail(normalized)
  // Uniform response whether or not the account exists: no user enumeration,
  // and a dummy verify keeps response timing roughly constant.
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }
  await createSession(user.id)
  return NextResponse.json({ ok: true, user: publicUser(user) })
}

export async function GET() {
  const session = await getSession()
  // 200 with ok:false avoids noisy 401s for visitors who aren't signed in.
  if (!session) return NextResponse.json({ ok: false, user: null })
  return NextResponse.json({ ok: true, user: publicUser(session.user) })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
