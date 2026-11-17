import { isSafeEndpoint, safeText } from "@/lib/validate"
import { encryptSecret } from "@/lib/inference-crypto"

/* --------------------------------------------------------------------------
   Shared inference config validation. Any provider label is accepted; the
   endpoint determines the actual API. "simulated" is the built-in harness.
   --------------------------------------------------------------------------- */

export type StoredInferenceConfig = {
  provider: string
  model: string
  endpoint: string
  encryptedApiKey?: string
}

export const PROVIDER_SUGGESTIONS = [
  "simulated",
  "openrouter",
  "openai",
  "anthropic",
  "xai (grok)",
  "groq",
  "together",
  "deepseek",
  "mistral",
  "custom",
] as const

export function normalizeInferenceConfig(
  input: unknown,
  current?: StoredInferenceConfig | null,
): { ok: true; config: StoredInferenceConfig } | { ok: false; error: string } {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const provider = safeText(obj.provider, 40) ?? "simulated"

  if (provider === "simulated") {
    return { ok: true, config: { provider, model: "surfdao-paper", endpoint: "", encryptedApiKey: "" } }
  }

  const endpoint = isSafeEndpoint(obj.endpoint) ? obj.endpoint : current?.endpoint
  if (!isSafeEndpoint(endpoint)) {
    return { ok: false, error: "Provide a public https endpoint for this provider" }
  }
  const keyInput = safeText(obj.apiKey, 300)
  const encryptedApiKey = keyInput ? encryptSecret(keyInput) : current?.encryptedApiKey
  if (!encryptedApiKey) {
    return { ok: false, error: "An API key is required for a custom provider" }
  }
  return {
    ok: true,
    config: {
      provider,
      model: safeText(obj.model, 80) ?? "default",
      endpoint,
      encryptedApiKey,
    },
  }
}
