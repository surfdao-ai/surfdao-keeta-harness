import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { store, rememberSession } from "@/lib/db/schema"
import { orchestrate } from "@/lib/agents/orchestrator"
import { runSafetyChecks } from "@/lib/keespecs/client"
import { getBalances } from "@/lib/keeta/client"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const session = await requireUser()
  const fund = await store.funds.findBySlug(slug)
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  }
  if (fund.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }
  if (fund.status === "paused") {
    return NextResponse.json({ error: "Fund is paused" }, { status: 400 })
  }

  // Portfolio snapshot from Keeta (paper mode returns simulated balance)
  const balances = await getBalances(fund.keetaWalletAddress || session.user.keetaAddress || "demo")
  const cash = balances.find((b) => b.token === "USDC")?.amount ?? 10000

  // Run agent pipeline
  const result = await orchestrate({
    mandate: fund.mandate as any,
    riskConfig: fund.riskConfig as any,
    portfolio: { cash, positions: {} },
    inferenceConfig: fund.inferenceConfig as any,
  })

  // KeeSpecs safety check before any material action
  const checks = await runSafetyChecks({
    address: fund.keetaWalletAddress || session.user.keetaAddress || "demo",
    amountUsdc: cash,
    action: "advance",
  })

  // Simulated NAV move from the aggregated score
  const lastSession = (await store.fundSessions.byFund(fund.id))[0]
  const prevNavNum = lastSession ? Number(lastSession.nav) : 10000
  const score = result.votes.reduce((a, b) => a + b.score, 0) / Math.max(result.votes.length, 1)
  const returnPct = (score - 50) / 200
  const nav = prevNavNum * (1 + returnPct)

  const createdSession = await store.fundSessions.create({
    fundId: fund.id,
    decisions: { weights: result.weights, votes: result.votes },
    checks,
    actions: { mode: result.mode, summary: result.summary },
    nav: Math.round(nav * 100) / 100,
    returnPct: Math.round(returnPct * 10000) / 100,
    status: "completed",
  })
  await rememberSession(createdSession)

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    summary: result.summary,
    checksPassed: result.checksPassed,
    waveCondition: checks.condition,
    nav,
    returnPct: Math.round(returnPct * 10000) / 100,
    votes: result.votes,
    weights: result.weights,
  })
}
