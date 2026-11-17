import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { createSession, destroySession, getSession, publicUser } from "@/lib/auth"
import { verifyPassword } from "@/lib/password"

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  const user = await store.users.findByEmail(email.toLowerCase().trim())
  if (!user) {
    return NextResponse.json({ error: "No account found. Create one first." }, { status: 404 })
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "This account needs a password. Sign up again to set one." },
      { status: 400 },
    )
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
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
