import { store } from "@/lib/db/schema"
import LeaderboardTable, { type LeaderboardRow } from "@/components/leaderboard-table"
import Disclaimer from "@/components/disclaimer"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
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

  const rows: LeaderboardRow[] = funds
    .filter((f) => f.isPublic)
    .map((f) => {
      const fs = byFund.get(f.id) ?? []
      const latest = fs[0]
      const totalReturn = fs.length
        ? (fs.reduce((acc, s) => acc * (1 + Number(s.returnPct ?? 0) / 100), 1) - 1) * 100
        : 0
      const rets = fs.slice(0, 10).map((s) => Number(s.returnPct ?? 0))
      const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0
      const variance = rets.length ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length : 0
      const consistency = rets.length ? Math.max(0, 100 - Math.sqrt(variance) * 10) : 50
      const aum = allocByFund.get(f.id) ?? 0
      const aumScore = Math.min(100, Math.log10(Math.max(aum, 1)) * 20)
      const composite = totalReturn * 0.4 + consistency * 0.3 + aumScore * 0.3
      return {
        rank: 0,
        slug: f.slug,
        name: f.name,
        ownerId: f.ownerId,
        status: f.status,
        totalReturn,
        nav: latest ? Number(latest.nav) : 10000,
        aum,
        allocators: allocCountByFund.get(f.id) ?? 0,
        consistency: Math.round(consistency * 100) / 100,
        composite: Math.round(composite * 100) / 100,
      }
    })
    .sort((a, b) => b.composite - a.composite)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foam">Public leaderboard</h1>
        <p className="text-foam/80 mt-1">The heat rankings. Risk-adjusted performance, consistency, and capital attraction.</p>
      </div>
      <LeaderboardTable rows={rows} />
      <Disclaimer variant="short" />
    </div>
  )
}
