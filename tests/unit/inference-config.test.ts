import { describe, it, expect, beforeAll } from "vitest"
import { normalizeInferenceConfig } from "@/lib/inference-config"

beforeAll(() => { process.env.INFERENCE_SECRET = "test-secret" })

const stored = { provider: "openai", model: "gpt-4o", endpoint: "https://api.openai.com/v1", encryptedApiKey: "enc:existing" }

describe("normalizeInferenceConfig", () => {
  it("normalizes simulated mode and clears credentials", () => {
    const r = normalizeInferenceConfig({ provider: "simulated" })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.provider).toBe("simulated")
      expect(r.config.endpoint).toBe("")
      expect(r.config.encryptedApiKey).toBe("")
    }
  })

  it("accepts any provider label with a public endpoint", () => {
    const r = normalizeInferenceConfig({
      provider: "my-custom-router", endpoint: "https://router.example.com/v1",
      apiKey: "sk-abc", model: "model-x",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.provider).toBe("my-custom-router")
      expect(r.config.model).toBe("model-x")
      expect(r.config.encryptedApiKey).not.toContain("sk-abc")
    }
  })

  it("rejects private endpoints even with a custom provider", () => {
    const r = normalizeInferenceConfig({ provider: "xai", endpoint: "http://127.0.0.1:8080", apiKey: "sk-x" })
    expect(r.ok).toBe(false)
  })

  it("keeps the existing endpoint and key when blank on update", () => {
    const r = normalizeInferenceConfig({ provider: "openrouter", model: "new-model", endpoint: "", apiKey: "" }, stored)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.endpoint).toBe(stored.endpoint)
      expect(r.config.encryptedApiKey).toBe(stored.encryptedApiKey)
      expect(r.config.model).toBe("new-model")
    }
  })

  it("requires a key when no encrypted key exists", () => {
    expect(normalizeInferenceConfig({ provider: "openai", endpoint: "https://api.openai.com" }).ok).toBe(false)
  })
})
