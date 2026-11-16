import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession, destroySession, getSession } from "@/lib/auth"

export async function POST(req: Request) {
  const { email, name, password } = await req.json().catch(() => ({}))
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 })
  }
  let user = await (await store.users.list()).find((u) => u.email === email)
  if (!user) {
    user = await store.users.create({ email: email.toLowerCase(), name: name ?? email.split("@")[0] })
  }
  await createSession(user.id)
  return NextResponse.json({ ok: true, user })
}
