import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { store, rememberAllocation } from "@/lib/db/schema"
import { runSafetyChecks } from "@/lib/keespecs/client"
import { sendToken } from "@/lib/keeta/client"

export async function GET() {
  const allocations = await store.allocations.list()
  return NextResponse.json({ allocations })
}

export async function POST(req: Request) {
  const session = await requireUser()
  const body = await req.json().catch(() => ({}))
  const { fundId, amountUsdc } = body
  if (!fundId || !amountUsdc || Number(amountUsdc) <= 0) {
    return NextResponse.json({ error: "fundId and amountUsdc required" }, { status: 400 })
  }

  const fund = await store.funds.findBySlug(fundId) ?? (await (await store.funds.list()).find((f) => f.id === fundId))
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  }
  if (!fund.isPublic) {
    return NextResponse.json({ error: "Fund is not public" }, { status: 403 })
  }

  // KeeSpecs safety check before the allocation
  const checks = await runSafetyChecks({
    address: fund.keetaWalletAddress || "demo",
    amountUsdc: Number(amountUsdc),
    action: "allocate",
  })

  let txHash: string | undefined
  let onChain = false
  if (process.env.LIVE_MODE === "true") {
    const sent = await sendToken({
      fromAddress: session.user.keetaAddress || "demo",
      toAddress: fund.keetaWalletAddress || "demo",
      amount: Number(amountUsdc),
    })
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error, checks }, { status: 400 })
    }
    txHash = sent.txHash
    onChain = true
  }

  const allocation = await store.allocations.create({
    fundId: fund.id,
    allocatorUserId: session.user.id,
    amountUsdc: Number(amountUsdc),
    keetaTxHash: txHash ?? null,
    status: onChain ? "active" : "pending",
  })

  await rememberAllocation(allocation)
  return NextResponse.json({ allocation, checks, onChain, simulated: !onChain })
}
