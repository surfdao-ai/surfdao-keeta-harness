import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"

/* Public leaderboard. Composite score = totalReturn + consistency + AUM factor. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // paper | live | paused
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)

  const funds = await store.funds.list()
  const sessions = await store.fundSessions.list()
  const allocations = await store.allocations.list()

  const byFund = new Map<string, typeof sessions>()
  for (const s of [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
    const arr = byFund.get(s.fundId) ?? []
    arr.push(s)
    byFund.set(s.fundId, arr)
  }

  const allocByFund = new Map<string, number>()
  const allocCountByFund = new Map<string, number>()
  for (const a of allocations) {
    if (a.status !== "active" && a.status !== "pending") continue
    allocByFund.set(a.fundId, (allocByFund.get(a.fundId) ?? 0) + Number(a.amountUsdc))
    allocCountByFund.set(a.fundId, (allocCountByFund.get(a.fundId) ?? 0) + 1)
  }

  const rows = funds
    .filter((f) => !status || f.status === status)
    .filter((f) => f.isPublic)
    .map((f) => {
      const fundSessions = byFund.get(f.id) ?? []
      const latest = fundSessions[0]
      const totalReturn = fundSessions.length
        ? (fundSessions.reduce((acc, s) => acc * (1 + Number(s.returnPct ?? 0) / 100), 1) - 1) * 100
        : 0
      const nav = latest ? Number(latest.nav) : 10000
      const aum = allocByFund.get(f.id) ?? 0
      const allocators = allocCountByFund.get(f.id) ?? 0
      // consistency: std dev of recent returns (lower = more consistent)
      const rets = fundSessions.slice(0, 10).map((s) => Number(s.returnPct ?? 0))
      const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0
      const variance = rets.length ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length : 0
      const consistency = rets.length ? Math.max(0, 100 - Math.sqrt(variance) * 10) : 50
      // composite: return (40%) + consistency (30%) + log AUM (30%)
      const aumScore = Math.min(100, Math.log10(Math.max(aum, 1)) * 20)
      const composite = totalReturn * 0.4 + consistency * 0.3 + aumScore * 0.3
      return {
        id: f.id,
        slug: f.slug,
        name: f.name,
        description: f.description,
        ownerId: f.ownerId,
        status: f.status,
        mode: f.executionMode ?? "paper",
        totalReturn,
        nav,
        aum,
        allocators,
        consistency: Math.round(consistency * 100) / 100,
        composite: Math.round(composite * 100) / 100,
        latestSession: latest?.timestamp,
      }
    })
    .sort((a, b) => b.composite - a.composite)
    .slice(0, limit)

  // assign ranks
  rows.forEach((r: any, i) => { r.rank = i + 1 })

  return NextResponse.json({ funds: rows })
}
