import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { liveReadiness } from "@/lib/live-mode"
import type { Fund } from "@/lib/db/schema"

const fund: Fund = {
  id: "f1", ownerId: "u1", name: "Test", description: null, slug: "test",
  status: "paper", mandate: {}, riskConfig: {}, inferenceConfig: {}, assets: [],
  keetaWalletAddress: null, executionMode: "paper", isPublic: true, createdAt: "2026-01-01T00:00:00Z",
}

const keys = ["LIVE_MODE", "X402_GATEWAY", "X402_TOKEN", "DATABASE_URL"] as const
let original: Record<string, string | undefined>

beforeEach(() => {
  original = {}
  keys.forEach((k) => { original[k] = process.env[k]; delete process.env[k] })
})
afterEach(() => {
  keys.forEach((k) => { if (original[k] === undefined) delete process.env[k]; else process.env[k] = original[k] })
})

describe("liveReadiness", () => {
  it("reports all server prerequisites missing by default", () => {
    const r = liveReadiness(fund)
    expect(r.enabled).toBe(false)
    expect(r.canEnable).toBe(false)
    expect(r.checks.filter((c) => !c.ok).map((c) => c.key)).toEqual(
      expect.arrayContaining(["flag", "x402", "database", "wallet", "vault"]),
    )
  })

  it("still blocks when server flags are set but fund addresses are missing", () => {
    process.env.LIVE_MODE = "true"
    process.env.X402_GATEWAY = "https://keespecs.xyz/x402"
    process.env.X402_TOKEN = "token"
    process.env.DATABASE_URL = "postgres://x"
    const r = liveReadiness(fund)
    expect(r.enabled).toBe(true)
    expect(r.canEnable).toBe(false)
    expect(r.checks.filter((c) => c.userAction && !c.ok).map((c) => c.key)).toEqual(["wallet", "vault"])
  })

  it("allows enabling when every prerequisite passes", () => {
    process.env.LIVE_MODE = "true"
    process.env.X402_GATEWAY = "https://keespecs.xyz/x402"
    process.env.X402_TOKEN = "token"
    process.env.DATABASE_URL = "postgres://x"
    const r = liveReadiness({
      ...fund, keetaWalletAddress: "keeta_wallet", vaultAddress: "keeta_vault",
    })
    expect(r.canEnable).toBe(true)
  })
})
