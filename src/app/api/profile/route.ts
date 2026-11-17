import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberUser } from "@/lib/db/schema"
import { publicUser } from "@/lib/auth"
import { safeText, assertSameOrigin } from "@/lib/validate"

const ALLOWED = [
  "name",
  "bio",
  "location",
  "website",
  "twitter",
  "keetaAddress",
  "imageUrl",
] as const
const LIMITS: Record<string, number> = {
  name: 60, bio: 500, location: 80, website: 200, twitter: 60, keetaAddress: 128, imageUrl: 300,
}

export async function GET() {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user: publicUser(session.user) })
}

export async function PUT(req: Request) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = safeText(body[key], LIMITS[key])
  }
  if (Array.isArray(body.favoriteStrategies)) {
    const valid = ["deep-value", "intrinsic-value", "quality-moat", "cash-flow-activist", "disruptive-growth", "contrarian-value", "risk-manager", "portfolio-manager"]
    updates.favoriteStrategies = body.favoriteStrategies.filter((s: unknown) => valid.includes(String(s))).slice(0, 8)
  }
  const updated = await store.users.update(session.user.id, updates)
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 })
  await rememberUser(updated)
  return NextResponse.json({ ok: true, user: publicUser(updated) })
}
