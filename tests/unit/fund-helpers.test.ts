import { describe, it, expect } from "vitest"
import { fundStats, visibleFunds, publicFund } from "@/lib/fund-helpers"
import type { Fund, FundSession, Allocation } from "@/lib/db/schema"

const baseFund: Fund = {
  id: "f1", ownerId: "u1", name: "Test", description: null, slug: "test",
  status: "paper", mandate: {}, riskConfig: {}, inferenceConfig: {}, assets: [],
  keetaWalletAddress: null, executionMode: "paper", isPublic: true, createdAt: "2026-01-01T00:00:00Z",
}
const session = (id: string, ts: string, nav: number, ret: number): FundSession => ({
  id, fundId: "f1", timestamp: ts, decisions: {}, checks: {}, actions: {}, nav, returnPct: ret, status: "completed",
})
const alloc = (id: string, user: string, amount: number, status: Allocation["status"] = "active"): Allocation => ({
  id, fundId: "f1", allocatorUserId: user, allocatorName: user, amountUsdc: amount,
  keetaTxHash: null, status, allocatedAt: "2026-01-02T00:00:00Z",
})

describe("fundStats", () => {
  it("returns defaults for a fund with no data", () => {
    const s = fundStats(baseFund, [], [])
    expect(s.nav).toBe(10000)
    expect(s.totalReturn).toBe(0)
    expect(s.aum).toBe(0)
    expect(s.allocators).toBe(0)
    expect(s.sessionCount).toBe(0)
  })

  it("computes AUM and distinct allocator count, ignoring withdrawn", () => {
    const s = fundStats(baseFund, [], [
      alloc("a1", "u2", 100), alloc("a2", "u2", 50),
      alloc("a3", "u3", 25), alloc("a4", "u4", 999, "withdrawn"),
    ])
    expect(s.aum).toBe(175)
    expect(s.allocators).toBe(2)
  })

  it("compounds session returns rather than using NAV differences", () => {
    const sessions = [
      session("s1", "2026-01-01T00:00:00Z", 10000, 10),
      session("s2", "2026-01-02T00:00:00Z", 15000, -5),
    ]
    const s = fundStats(baseFund, sessions, [])
    // 1.10 * 0.95 - 1 = 4.5%, even though NAV jumped 5000 from new capital.
    expect(s.totalReturn).toBeCloseTo(4.5, 5)
    expect(s.nav).toBe(15000)
    expect(s.latestReturn).toBe(-5)
  })

  it("uses the newest session by timestamp regardless of input order", () => {
    const sessions = [
      session("old", "2026-01-01T00:00:00Z", 10000, 1),
      session("new", "2026-01-05T00:00:00Z", 12000, 2),
    ]
    expect(fundStats(baseFund, sessions, []).nav).toBe(12000)
    expect(fundStats(baseFund, [...sessions].reverse(), []).nav).toBe(12000)
  })
})

describe("visibleFunds", () => {
  const mine: Fund = { ...baseFund, id: "mine", ownerId: "u1", isPublic: false, slug: "mine" }
  const myPublic: Fund = { ...baseFund, id: "mp", ownerId: "u1", isPublic: true, slug: "mp" }
  const theirsPrivate: Fund = { ...baseFund, id: "tp", ownerId: "u2", isPublic: false, slug: "tp" }
  const theirsPublic: Fund = { ...baseFund, id: "tpp", ownerId: "u2", isPublic: true, slug: "tpp" }

  it("returns the user's own funds plus other users' public funds only", () => {
    const visible = visibleFunds([mine, myPublic, theirsPrivate, theirsPublic], "u1").map((f) => f.id)
    expect(visible).toContain("mine")
    expect(visible).toContain("mp")
    expect(visible).not.toContain("tp")
    expect(visible).toContain("tpp")
  })

  it("does not leak another user's private fund to a different owner", () => {
    const visible = visibleFunds([mine, theirsPrivate], "u9")
    expect(visible).toEqual([])
  })
})

describe("publicFund", () => {
  it("strips the encrypted inference key from the public shape", () => {
    const fund: Fund = {
      ...baseFund,
      inferenceConfig: { provider: "openai", model: "gpt-4", endpoint: "https://api.openai.com/v1", encryptedApiKey: "iv.tag.data" },
    }
    const pub = publicFund(fund)
    expect((pub.inferenceConfig as any).provider).toBe("openai")
    expect((pub.inferenceConfig as any).hasApiKey).toBe(true)
    expect(JSON.stringify(pub)).not.toContain("iv.tag.data")
    expect(JSON.stringify(pub)).not.toContain("encryptedApiKey")
  })
})
