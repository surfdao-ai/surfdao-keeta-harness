import { describe, it, expect } from "vitest"
import { orchestrate } from "@/lib/agents/orchestrator"
import { DEFAULT_MANDATE } from "@/lib/agents/personas"

describe("orchestrate (paper simulator)", () => {
  it("returns votes and agent weights summing to 100", async () => {
    const r = await orchestrate({ mandate: DEFAULT_MANDATE })
    expect(r.mode).toBe("simulated")
    expect(r.votes.length).toBe(DEFAULT_MANDATE.agents.length)
    const total = Object.values(r.weights).reduce((a, b) => a + b, 0)
    expect(total).toBe(100)
  })

  it("returns target weights for the fund's chosen assets summing to ~100", async () => {
    const r = await orchestrate({ mandate: DEFAULT_MANDATE, assets: ["USDC", "KTA"] })
    expect(Object.keys(r.assetWeights).sort()).toEqual(["KTA", "USDC"])
    const total = Object.values(r.assetWeights).reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(99)
    expect(total).toBeLessThanOrEqual(100.5)
  })

  it("falls back to simulated when given an unsafe endpoint", async () => {
    const r = await orchestrate({
      mandate: DEFAULT_MANDATE,
      inferenceConfig: { provider: "openai", endpoint: "http://localhost:1234", apiKey: "sk-x" },
    })
    expect(r.mode).toBe("simulated")
  })
})
