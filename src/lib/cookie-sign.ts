import { createHmac, timingSafeEqual } from "node:crypto"

/* --------------------------------------------------------------------------
   Signed cookie values. The zero-config store mirrors records into cookies
   so they survive cross-instance requests on Vercel. Signing prevents a
   client from forging a user/admin record by editing its own cookies.
--------------------------------------------------------------------------- */

const SECRET = process.env.COOKIE_SECRET || "surfdao-dev-secret-change-me"

export function signValue(value: string): string {
  const sig = createHmac("sha256", SECRET).update(value).digest("base64url")
  return `${sig}.${value}`
}

export function unsignValue(signed: string): string | null {
  const firstDot = signed.indexOf(".")
  if (firstDot < 1) return null
  const sig = signed.slice(0, firstDot)
  const value = signed.slice(firstDot + 1)
  const expected = createHmac("sha256", SECRET).update(value).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return value
}
