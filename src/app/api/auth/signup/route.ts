import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession } from "@/lib/auth"
import { hashPassword } from "@/lib/password"

export async function POST(req: Request) {
  const { email, name, password } = await req.json().catch(() => ({}))
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const normalized = email.toLowerCase().trim()
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
      name: name || user.name || normalized.split("@")[0],
    })
  } else {
    user = await store.users.create({
      email: normalized,
      name: name || normalized.split("@")[0],
      passwordHash,
    })
  }

  if (!user) return NextResponse.json({ error: "Could not create account" }, { status: 500 })
  await createSession(user.id)
  return NextResponse.json({ ok: true, user })
}
