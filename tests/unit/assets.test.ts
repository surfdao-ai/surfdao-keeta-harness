import { describe, it, expect } from "vitest"
import { getMarketSnapshot, CURATED_ASSETS } from "@/lib/assets/keeta-assets"

describe("getMarketSnapshot", () => {
  it("is deterministic for the same symbol/session and different across sessions", async () => {
    const a = await getMarketSnapshot(["KTA"], 0)
    const b = await getMarketSnapshot(["KTA"], 0)
    const c = await getMarketSnapshot(["KTA"], 1)
    // asOf is a wall-clock timestamp; the deterministic part is price/change/volume.
    expect({ prices: a.prices, changes: a.changes24h, volume: a.volume }).toEqual({
      prices: b.prices, changes: b.changes24h, volume: b.volume,
    })
    expect(a.changes24h.KTA).not.toBe(c.changes24h.KTA)
  })

  it("keeps stablecoins near their peg while volatile assets can move", async () => {
    let sawStableMove = false
    let sawVolatileMove = false
    for (let i = 0; i < 12; i++) {
      const s = await getMarketSnapshot(["USDC", "KTA"], i)
      expect(Math.abs(s.changes24h.USDC)).toBeLessThanOrEqual(0.4)
      expect(s.prices.USDC).toBeGreaterThan(0.99)
      expect(s.prices.USDC).toBeLessThan(1.01)
      if (s.changes24h.USDC !== 0) sawStableMove = true
      // Volatile assets should at times move beyond the stablecoin peg band.
      if (Math.abs(s.changes24h.KTA) > 0.4) sawVolatileMove = true
    }
    expect(sawStableMove).toBe(true)
    expect(sawVolatileMove).toBe(true)
  })

  it("uses curated USDC price of 1", () => {
    expect(CURATED_ASSETS.find((a) => a.symbol === "USDC")?.priceUsd).toBe(1)
  })
})
