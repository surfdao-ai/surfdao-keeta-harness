import type { Fund, Allocation, FundSession } from "@/lib/db/schema"

/* Single source of truth for fund figures used across dashboard, cards, profile. */
export function fundStats(
  fund: Fund,
  sessions: FundSession[],
  allocations: Allocation[],
) {
  const mine = sessions.filter((s) => s.fundId === fund.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const fundAllocs = allocations.filter(
    (a) => a.fundId === fund.id && a.status !== "withdrawn",
  )
  const aum = fundAllocs.reduce((s, a) => s + Number(a.amountUsdc), 0)
  const latest = mine[0]
  // Compound per-session returns so new allocations don't inflate performance.
  const totalReturn = mine.length
    ? (mine.reduce((acc, s) => acc * (1 + Number(s.returnPct ?? 0) / 100), 1) - 1) * 100
    : 0
  return {
    nav: latest ? Number(latest.nav) : 10000,
    totalReturn,
    aum,
    allocators: new Set(fundAllocs.map((a) => a.allocatorUserId)).size,
    sessionCount: mine.length,
    latestSession: latest ?? null,
    latestReturn: latest ? Number(latest.returnPct ?? 0) : 0,
  }
}


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
