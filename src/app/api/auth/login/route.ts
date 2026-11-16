import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession, destroySession, getSession } from "@/lib/auth"

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 })
  }
  let user = await (await store.users.list()).find((u) => u.email === email)
  if (!user) {
    user = await store.users.create({ email: email.toLowerCase(), name: email.split("@")[0] })
  }
  await createSession(user.id)
  return NextResponse.json({ ok: true, user })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false, user: null }, { status: 401 })
  return NextResponse.json({ ok: true, user: session.user })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
