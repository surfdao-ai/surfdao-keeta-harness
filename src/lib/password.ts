import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

/* --------------------------------------------------------------------------
   Password hashing for the zero-config MVP auth. Uses Node's scrypt with a
   random per-user salt. Swap for Clerk/Auth.js (Argon2/bcrypt) in production.
--------------------------------------------------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(":")
    if (!salt || !key) return false
    const derived = scryptSync(password, salt, 64)
    const storedBuf = Buffer.from(key, "hex")
    if (storedBuf.length !== derived.length) return false
    return timingSafeEqual(derived, storedBuf)
  } catch {
    return false
  }
}
