import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberSession, type Fund } from "@/lib/db/schema"
import { orchestrate } from "@/lib/agents/orchestrator"
import { runSafetyChecks } from "@/lib/keespecs/client"
import { getBalances } from "@/lib/keeta/client"
import { assertSameOrigin } from "@/lib/validate"
import { rateLimit } from "@/lib/rate-limit"
import { getMarketSnapshot, CURATED_ASSETS } from "@/lib/assets/keeta-assets"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  // Throttle advances per user: each one runs the full agent + safety pipeline.
  if (!rateLimit(`advance:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many advances. Try again in a minute." }, { status: 429 })
  }
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (fund.ownerId !== session.user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  if (fund.status === "paused") return NextResponse.json({ error: "Fund is paused" }, { status: 400 })
  if (fund.executionMode === "live" && process.env.LIVE_MODE !== "true") {
    return NextResponse.json({ error: "Fund requests live execution but the server flag is off" }, { status: 400 })
  }

  const assets: Fund["assets"] =
    fund.assets?.length ? fund.assets : CURATED_ASSETS.slice(0, 2).map((a) => ({
      symbol: a.symbol, name: a.name, address: a.address, weight: 50, color: a.color,
    }))
  const symbols = assets.map((a) => a.symbol)
  const priorSessions = await store.fundSessions.byFund(fund.id)
  const market = await getMarketSnapshot(symbols, priorSessions.length)
  const prices = market.prices

  const balances = await getBalances(fund.keetaWalletAddress || session.user.keetaAddress || "demo")
  const cash = balances.find((b) => b.token === "USDC")?.amount ?? 10000

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

  // NAV = prior performance + any new capital allocated since the last session.
  const assetWeights = result.assetWeights
  const lastSession = priorSessions[0]
  const allocations = await store.allocations.byFund(fund.id)
  const aum = allocations.reduce((sum, a) => sum + Number(a.amountUsdc), 0)
  const aumAtLastSession = lastSession ? Number((lastSession.actions as any)?.aum ?? 0) : 0
  const newCapital = Math.max(0, aum - aumAtLastSession)
  const prevNav = (lastSession ? Number(lastSession.nav) : 10000) + newCapital

  // Return is driven only by the price moves of the assets the harness actually holds.
  const weightedChange = assets.reduce((sum, a) => {
    const change = market.changes24h[a.symbol] ?? 0
    return sum + ((assetWeights[a.symbol] ?? a.weight) / 100) * (change / 100)
  }, 0)
  const returnPct = Math.max(-25, Math.min(25, weightedChange))
  const nav = prevNav * (1 + returnPct)

  const createdSession = await store.fundSessions.create({
    fundId: fund.id,
    decisions: {
      weights: result.weights,
      assetWeights,
      votes: result.votes,
      holdings: assets.map((a) => ({
        symbol: a.symbol,
        configuredWeight: a.weight,
        targetWeight: assetWeights[a.symbol] ?? a.weight,
        priceUsd: prices[a.symbol],
        change24h: market.changes24h[a.symbol] ?? 0,
      })),
    },
    checks,
    actions: { mode: result.mode, summary: result.summary, assets: symbols, aum, newCapital, prices: market.prices },
    nav: Math.round(nav * 100) / 100,
    returnPct: Math.round(returnPct * 10000) / 100,
    status: "completed",
  })
  await rememberSession(createdSession)

  // Model A/D: keeper holds principal; the creator only earns a performance fee
  // on gains, paid to their own wallet (tracked now, paid by the keeper in live mode).
  let performanceFee = null
  const feePct = Number((fund as any).performanceFeePct ?? 10)
  const gain = prevNav * returnPct
  if (feePct > 0 && gain > 0) {
    const feeUsdc = Math.round(gain * (feePct / 100) * 100) / 100
    const wallet = (fund as any).feeWalletAddress || (fund as any).keetaWalletAddress || null
    if (wallet) {
      performanceFee = await store.fees.create({
        fundId: fund.id,
        ownerId: fund.ownerId,
        sessionId: createdSession.id,
        walletAddress: wallet,
        feeUsdc,
        status: "pending",
        paidAt: null,
        txHash: null,
      })
    }
  }

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
    aum,
    newCapital,
    performanceFee,
    sessionIndex: priorSessions.length,
  })
}
