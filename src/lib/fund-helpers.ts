import type { Fund } from "@/lib/db/schema"

/* Public representation of a fund: never leak encrypted inference keys. */
export function publicFund<T extends Fund>(fund: T) {
  const cfg = (fund.inferenceConfig ?? {}) as Record<string, unknown>
  return {
    ...fund,
    inferenceConfig: {
      provider: cfg.provider ?? "simulated",
      model: cfg.model ?? "surfdao-paper",
      hasCustomEndpoint: Boolean(cfg.endpoint),
      hasApiKey: Boolean(cfg.encryptedApiKey),
    },
  }
}
