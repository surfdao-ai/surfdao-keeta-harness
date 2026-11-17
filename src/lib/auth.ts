import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { store, rememberAuthSession } from "@/lib/db/schema"

/* --------------------------------------------------------------------------
   SurfDAO.ai — Dev session auth (zero-config MVP)

   Cookie-based sessions. Good enough to verify the full flow locally and on
   Vercel preview without provisioning Clerk. Replace with Clerk (per the
   spec) by swapping this file for Clerk's auth hooks + middleware.
--------------------------------------------------------------------------- */

const SESSION_COOKIE = "surfdao_session"

/** Strip sensitive fields before sending a user to the client. */
export function publicUser<T extends { passwordHash?: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safe } = user
  return safe
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await store.sessions.findByToken(token)
  if (!session) return null
  if (new Date(session.expiresAt) < new Date()) {
    await store.sessions.delete(token)
    return null
  }
  const user = await (await store.users.list()).find((u) => u.id === session.userId)
  if (!user) return null
  return { user, session }
}

export async function requireUser() {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

/** For API route handlers: never redirect (fetch would receive HTML). */
export async function getApiUser() {
  return getSession()
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const session = await store.sessions.create({ userId, token, expiresAt })
  await rememberAuthSession(session)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1",
    maxAge: 60 * 60 * 24 * 30,
  })
  return token
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await store.sessions.delete(token)
  // Clear every mirrored cookie so a new user never inherits stale records.
  for (const name of [
    SESSION_COOKIE,
    "surfdao_auth",
    "surfdao_user",
    "surfdao_funds",
    "surfdao_allocs",
    "surfdao_sessions",
  ]) {
    cookieStore.delete(name)
  }
}
