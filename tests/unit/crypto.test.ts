import { describe, it, expect, beforeAll } from "vitest"
import { signValue, unsignValue } from "@/lib/cookie-sign"
import { hashPassword, verifyPassword } from "@/lib/password"
import { encryptSecret, decryptSecret } from "@/lib/inference-crypto"

describe("signed cookies", () => {
  it("round-trips a value", () => {
    const signed = signValue("hello")
    expect(signed).not.toBe("hello")
    expect(unsignValue(signed)).toBe("hello")
  })
  it("rejects tampering and malformed values", () => {
    const signed = signValue("hello")
    expect(unsignValue(signed.slice(0, -1) + "x")).toBeNull()
    expect(unsignValue("garbage")).toBeNull()
    expect(unsignValue("")).toBeNull()
  })
})

describe("password hashing", () => {
  it("verifies a correct password with a random salt", () => {
    const a = hashPassword("surfsecret1")
    const b = hashPassword("surfsecret1")
    expect(a).not.toBe(b)
    expect(verifyPassword("surfsecret1", a)).toBe(true)
    expect(verifyPassword("surfsecret1", b)).toBe(true)
  })
  it("rejects wrong passwords and malformed hashes", () => {
    const h = hashPassword("surfsecret1")
    expect(verifyPassword("wrong", h)).toBe(false)
    expect(verifyPassword("x", "not-a-hash")).toBe(false)
  })
})

describe("inference key encryption", () => {
  beforeAll(() => { process.env.INFERENCE_SECRET = "test-secret" })
  it("round-trips a secret", () => {
    const enc = encryptSecret("sk-super-secret")
    expect(enc).not.toContain("sk-super-secret")
    expect(decryptSecret(enc)).toBe("sk-super-secret")
  })
  it("returns null for corrupted ciphertext", () => {
    expect(decryptSecret("a.b.c")).toBeNull()
  })
})
