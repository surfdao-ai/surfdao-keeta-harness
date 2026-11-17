import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/* --------------------------------------------------------------------------
   Encryption for user-supplied inference API keys. Keys are stored encrypted
   and never returned to the client. Use a dedicated INFERENCE_SECRET in prod.
--------------------------------------------------------------------------- */

const SECRET =
  process.env.INFERENCE_SECRET || process.env.COOKIE_SECRET || "surfdao-dev-inference-secret"

function deriveKey(): Buffer {
  return scryptSync(SECRET, "surfdao-inference-v1", 32)
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".")
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".")
    if (!ivB64 || !tagB64 || !dataB64) return null
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivB64, "base64"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64"))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}
