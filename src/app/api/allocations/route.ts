import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberAllocation } from "@/lib/db/schema"
import { runSafetyChecks } from "@/lib/keespecs/client"
import { sendToken } from "@/lib/keeta/client"
import { safeAmount, safeText, assertSameOrigin } from "@/lib/validate"

export async function GET() {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const allocations = await store.allocations.list()
  return NextResponse.json({ allocations })
}

export async function POST(req: Request) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const fundKey = safeText(body.fundId, 128)
  const amount = safeAmount(body.amountUsdc)
  if (!fundKey) return NextResponse.json({ error: "Choose a fund to allocate into." }, { status: 400 })
  if (!amount) return NextResponse.json({ error: "Enter an amount between 0 and 1,000,000 USDC." }, { status: 400 })

  const fund =
    (await store.funds.findBySlug(fundKey)) ??
    (await store.funds.list()).find((f) => f.id === fundKey)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (!fund.isPublic) return NextResponse.json({ error: "Fund is not public" }, { status: 403 })

  const checks = await runSafetyChecks({
    address: fund.keetaWalletAddress || "demo",
    amountUsdc: amount,
    action: "allocate",
  })

  let txHash: string | undefined
  let onChain = false
  if (process.env.LIVE_MODE === "true") {
    const sent = await sendToken({
      fromAddress: session.user.keetaAddress || "demo",
      toAddress: fund.keetaWalletAddress || "demo",
      amount,
    })
    if (!sent.ok) return NextResponse.json({ error: sent.error, checks }, { status: 400 })
    txHash = sent.txHash
    onChain = true
  }

  const allocation = await store.allocations.create({
    fundId: fund.id,
    allocatorUserId: session.user.id,
    amountUsdc: amount,
    keetaTxHash: txHash ?? null,
    status: onChain ? "active" : "pending",
  })
  await rememberAllocation(allocation)
  return NextResponse.json({ allocation, checks, onChain, simulated: !onChain })
}
