import { describe, it, expect } from "vitest"
import { safeText, safeJson, safeAmount, isSafeEndpoint, assertSameOrigin } from "@/lib/validate"

describe("safeText", () => {
  it("trims and accepts valid text", () => {
    expect(safeText("  hello  ", 20)).toBe("hello")
  })
  it("rejects empty, too-long and non-string values", () => {
    expect(safeText("   ", 20)).toBeNull()
    expect(safeText("abcdef", 5)).toBeNull()
    expect(safeText(123, 20)).toBeNull()
  })
  it("strips control characters", () => {
    expect(safeText("a\u0000b\nc", 20)).toBe("ab c".replace(" ", ""))
  })
})

describe("safeJson", () => {
  it("returns fallback for null or oversized values", () => {
    const fallback = { ok: true }
    expect(safeJson(null, fallback)).toBe(fallback)
    expect(safeJson("x".repeat(5000), fallback)).toBe(fallback)
  })
  it("round-trips plain objects", () => {
    expect(safeJson({ agents: [1, 2] }, {})).toEqual({ agents: [1, 2] })
  })
})

describe("safeAmount", () => {
  it("accepts positive finite amounts and rounds to 6 decimals", () => {
    expect(safeAmount("12.3456789")).toBe(12.345679)
  })
  it("rejects zero, negative, NaN, Infinity and over-max", () => {
    for (const v of [0, -1, "abc", "Infinity", 1_000_001]) {
      expect(safeAmount(v)).toBeNull()
    }
  })
})

describe("isSafeEndpoint (SSRF guard)", () => {
  it("accepts public https URLs", () => {
    expect(isSafeEndpoint("https://api.openrouter.ai/api/v1")).toBe(true)
    expect(isSafeEndpoint("https://example.com")).toBe(true)
  })
  it("rejects non-https and private/metadata hosts", () => {
    const bad = [
      "http://example.com",
      "https://localhost/v1",
      "https://127.0.0.1",
      "https://169.254.169.254/latest",
      "https://10.0.0.5",
      "https://192.168.1.1",
      "https://172.16.0.1",
      "https://service.internal",
      "not-a-url",
    ]
    bad.forEach((url) => expect(isSafeEndpoint(url), url).toBe(false))
  })
})

describe("assertSameOrigin", () => {
  const req = (origin: string | null, host = "surfdao.ai") =>
    ({ headers: { get: (k: string) => (k === "origin" ? origin : host) } }) as unknown as Request

  it("allows missing origin (server-to-server)", () => {
    expect(assertSameOrigin(req(null))).toBe(true)
  })
  it("allows same host and blocks cross-origin", () => {
    expect(assertSameOrigin(req("https://surfdao.ai"))).toBe(true)
    expect(assertSameOrigin(req("https://evil.com"))).toBe(false)
  })
})
