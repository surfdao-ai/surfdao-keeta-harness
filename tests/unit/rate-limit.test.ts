import { describe, it, expect } from "vitest"
import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit", () => {
  it("allows up to the limit and blocks beyond it", () => {
    const key = `test:${Date.now()}`
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(false)
    expect(rateLimit(key, 3, 60_000)).toBe(false)
  })

  it("tracks keys independently", () => {
    const a = `a:${Date.now()}`
    const b = `b:${Date.now()}`
    expect(rateLimit(a, 1, 60_000)).toBe(true)
    expect(rateLimit(a, 1, 60_000)).toBe(false)
    expect(rateLimit(b, 1, 60_000)).toBe(true)
  })

  it("resets after the window elapses", () => {
    const key = `reset:${Date.now()}`
    expect(rateLimit(key, 1, 10)).toBe(true)
    expect(rateLimit(key, 1, 10)).toBe(false)
    // wait out the 10ms window
    return new Promise<void>((resolve) => setTimeout(resolve, 30)).then(() => {
      expect(rateLimit(key, 1, 10)).toBe(true)
    })
  })
})
