import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberSession, type Fund } from "@/lib/db/schema"
import { orchestrate } from "@/lib/agents/orchestrator"
import { runSafetyChecks } from "@/lib/keespecs/client"
import { getBalances } from "@/lib/keeta/client"
import { assertSameOrigin } from "@/lib/validate"
import { getPrices, CURATED_ASSETS } from "@/lib/assets/keeta-assets"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(_req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (fund.ownerId !== session.user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  if (fund.status === "paused") return NextResponse.json({ error: "Fund is paused" }, { status: 400 })

  const assets: Fund["assets"] =
    fund.assets?.length ? fund.assets : CURATED_ASSETS.slice(0, 2).map((a) => ({
      symbol: a.symbol, name: a.name, address: a.address, weight: 50, color: a.color,
    }))
  const symbols = assets.map((a) => a.symbol)
  const prices = await getPrices(symbols)

  const balances = await getBalances(fund.keetaWalletAddress || session.user.keetaAddress || "demo")
  const cash = balances.find((b) => b.token === "USDC")?.amount ?? 10000

  // Market snapshot for the agent harness, built from the fund's own universe.
  const market = {
    prices,
    changes24h: Object.fromEntries(symbols.map((s, i) => [s, Math.sin(i * 1.7 + Date.now() / 1e10) * 6])),
    volume: Object.fromEntries(symbols.map((s, i) => [s, 1e6 * (i + 1)])),
    asOf: new Date().toISOString(),
  }

  const result = await orchestrate({
    mandate: fund.mandate as any,
    riskConfig: fund.riskConfig as any,
    portfolio: { cash, positions: {} },
    market,
    assets: symbols,
    inferenceConfig: fund.inferenceConfig as any,
  })

  const checks = await runSafetyChecks({
    address: fund.keetaWalletAddress || session.user.keetaAddress || "demo",
    amountUsdc: cash,
    action: "advance",
  })

  // Blend each asset's mandate weight with the harness target from the PM vote.
  const assetWeights = result.assetWeights
  const lastSession = (await store.fundSessions.byFund(fund.id))[0]
  const prevNav = lastSession ? Number(lastSession.nav) : 10000
  const weightedChange = assets.reduce((sum, a) => {
    const change = market.changes24h[a.symbol] ?? 0
    return sum + (assetWeights[a.symbol] ?? a.weight) / 100 * (change / 100) * 0.25
  }, 0)
  const returnPct = Math.max(-10, Math.min(10, weightedChange))
  const nav = prevNav * (1 + returnPct)

  const createdSession = await store.fundSessions.create({
    fundId: fund.id,
    decisions: { weights: result.weights, assetWeights, votes: result.votes, holdings: assets.map((a) => ({
      symbol: a.symbol,
      targetWeight: assetWeights[a.symbol] ?? a.weight,
      priceUsd: prices[a.symbol],
    })) },
    checks,
    actions: { mode: result.mode, summary: result.summary, assets: symbols },
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
    assetWeights,
    prices,
  })
}
