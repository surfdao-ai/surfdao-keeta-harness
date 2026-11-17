import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession, publicUser } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { rateLimit } from "@/lib/rate-limit"
import { safeText, assertSameOrigin } from "@/lib/validate"

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (!rateLimit(`signup:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 })
  }
  const { email, name, password } = await req.json().catch(() => ({}))
  if (!email || typeof email !== "string" || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 })
  }

  const normalized = email.toLowerCase().trim()
  const safeName = safeText(name, 60) ?? normalized.split("@")[0]
  let user = await store.users.findByEmail(normalized)

  if (user?.passwordHash) {
    return NextResponse.json(
      { error: "An account with that email already exists. Sign in instead." },
      { status: 409 },
    )
  }

  const passwordHash = hashPassword(password)
  if (user) {
    // Migrate a legacy email-only account to password auth.
    user = await store.users.update(user.id, {
      passwordHash,
      name: safeName || user.name || normalized.split("@")[0],
    })
  } else {
    user = await store.users.create({
      email: normalized,
      name: safeName,
      passwordHash,
    })
  }

  if (!user) return NextResponse.json({ error: "Could not create account" }, { status: 500 })
  await createSession(user.id)
  return NextResponse.json({ ok: true, user: publicUser(user) })
}
