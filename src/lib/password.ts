import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

/* --------------------------------------------------------------------------
   Password hashing for the zero-config MVP auth. Uses Node's scrypt with a
   random per-user salt and OWASP-recommended cost parameters.
   Swap for Clerk/Auth.js (Argon2/bcrypt) in production.
--------------------------------------------------------------------------- */

/* OWASP minimum: N=16384, r=8, p=1. */
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_OPTS).toString("hex")
  return `${salt}:${derived}`
}

/* Always performs the full scrypt derivation (same work for any stored value)
   and compares against a fixed-length buffer, so response timing does not
   reveal whether a record exists or is well-formed. */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(":")
    const derived = scryptSync(password, salt ?? "", KEY_LEN, SCRYPT_OPTS)
    const storedBuf = Buffer.from(key ?? "", "hex")
    const comparable = storedBuf.length === KEY_LEN ? storedBuf : Buffer.alloc(KEY_LEN)
    const equal = timingSafeEqual(derived, comparable)
    return equal && storedBuf.length === KEY_LEN
  } catch {
    return false
  }
}
