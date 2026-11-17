import { NextResponse } from "next/server"
import { requireUser, publicUser } from "@/lib/auth"
import { store, rememberUser } from "@/lib/db/schema"

const ALLOWED = [
  "name",
  "bio",
  "location",
  "website",
  "twitter",
  "keetaAddress",
  "imageUrl",
  "favoriteStrategies",
] as const

export async function GET() {
  const session = await requireUser()
  return NextResponse.json({ user: publicUser(session.user) })
}

export async function PUT(req: Request) {
  const session = await requireUser()
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }
  const updated = await store.users.update(session.user.id, updates)
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 })
  await rememberUser(updated)
  return NextResponse.json({ ok: true, user: publicUser(updated) })
}
