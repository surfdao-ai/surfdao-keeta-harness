import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  }
  const sessions = await store.fundSessions.byFund(fund.id)
  const allocations = await store.allocations.byFund(fund.id)
  const aum = allocations.reduce((sum, a) => sum + Number(a.amountUsdc), 0)
  const latest = sessions[0]
  return NextResponse.json({ fund, sessions, allocations, aum, latestNav: latest?.nav ?? null })
}
