import type { Fund } from "@/lib/db/schema"

export type ReadinessCheck = {
  key: string
  label: string
  ok: boolean
  detail: string
  userAction: boolean
}

/* Server-truth about what is configured for live execution. */
export function liveReadiness(fund?: Partial<Fund> | null): {
  enabled: boolean
  checks: ReadinessCheck[]
  canEnable: boolean
} {
  const checks: ReadinessCheck[] = [
    {
      key: "flag",
      label: "Server LIVE_MODE flag",
      ok: process.env.LIVE_MODE === "true",
      detail: process.env.LIVE_MODE === "true" ? "Enabled on the server" : "Set LIVE_MODE=true and redeploy",
      userAction: false,
    },
    {
      key: "x402",
      label: "KeeSpecs x402 gateway + token",
      ok: Boolean(process.env.X402_GATEWAY && process.env.X402_TOKEN),
      detail: process.env.X402_GATEWAY && process.env.X402_TOKEN ? "Paid safety checks configured" : "Set X402_GATEWAY and X402_TOKEN",
      userAction: false,
    },
    {
      key: "database",
      label: "Durable database",
      ok: Boolean(process.env.DATABASE_URL),
      detail: process.env.DATABASE_URL ? "Neon/Postgres connected" : "Set DATABASE_URL (Neon/Postgres)",
      userAction: false,
    },
    {
      key: "wallet",
      label: "Fund Keeta wallet",
      ok: Boolean(fund?.keetaWalletAddress?.startsWith("keeta_")),
      detail: fund?.keetaWalletAddress ? "Fund address configured" : "Add a funded Keeta address to the fund",
      userAction: true,
    },
    {
      key: "vault",
      label: "Audited vault address",
      ok: Boolean(fund?.vaultAddress?.startsWith("keeta_")),
      detail: fund?.vaultAddress ? "Vault address configured" : "Provide your own audited vault address",
      userAction: true,
    },
  ]
  const canEnable = checks.every((c) => c.ok)
  return { enabled: process.env.LIVE_MODE === "true", checks, canEnable }
}
