import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"

/* Everything the current user has done, scoped strictly to their own id. */
export async function GET() {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const [allFunds, allAllocations, allSessions] = await Promise.all([
    store.funds.list(),
    store.allocations.list(),
    store.fundSessions.list(),
  ])

  const funds = allFunds
    .filter((f) => f.ownerId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((f) => {
      const fundSessions = allSessions.filter((s) => s.fundId === f.id)
      const aum = allAllocations
        .filter((a) => a.fundId === f.id && a.status !== "withdrawn")
        .reduce((sum, a) => sum + Number(a.amountUsdc), 0)
      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        status: f.status,
        createdAt: f.createdAt,
        sessions: fundSessions.length,
        aum,
        latestReturn: fundSessions[0] ? Number(fundSessions[0].returnPct ?? 0) : 0,
      }
    })

  const allocations = allAllocations
    .filter((a) => a.allocatorUserId === userId)
    .sort((a, b) => b.allocatedAt.localeCompare(a.allocatedAt))
    .map((a) => ({
      id: a.id,
      fundId: a.fundId,
      fundName: allFunds.find((f) => f.id === a.fundId)?.name ?? "Unknown fund",
      fundSlug: allFunds.find((f) => f.id === a.fundId)?.slug ?? "",
      amountUsdc: Number(a.amountUsdc),
      status: a.status,
      allocatedAt: a.allocatedAt,
    }))

  const ownedFundIds = new Set(funds.map((f) => f.id))
  const activity = allSessions
    .filter((s) => ownedFundIds.has(s.fundId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      fundName: allFunds.find((f) => f.id === s.fundId)?.name ?? "Unknown fund",
      fundSlug: allFunds.find((f) => f.id === s.fundId)?.slug ?? "",
      nav: Number(s.nav),
      returnPct: Number(s.returnPct ?? 0),
      timestamp: s.timestamp,
    }))

  return NextResponse.json({ funds, allocations, activity })
}
