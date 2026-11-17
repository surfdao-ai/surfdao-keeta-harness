import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { assertSameOrigin, safeText } from "@/lib/validate"
import { safeAmount } from "@/lib/validate"

export async function GET() {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const withdrawals = await store.withdrawals.byUser(session.user.id)
  return NextResponse.json({ withdrawals })
}

export async function POST(req: Request) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const fundKey = safeText(body.fundId, 128)
  const amount = safeAmount(body.amountUsdc)
  const keetaAddress = safeText(body.keetaAddress, 128) ?? session.user.keetaAddress
  if (!fundKey) return NextResponse.json({ error: "Fund is required" }, { status: 400 })
  if (!amount) return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  if (!keetaAddress || !keetaAddress.startsWith("keeta_")) {
    return NextResponse.json({ error: "A Keeta wallet address is required. Add it to your profile." }, { status: 400 })
  }

  const fund = (await store.funds.findBySlug(fundKey)) ??
    (await store.funds.list()).find((f) => f.id === fundKey)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (!(fund as any).vaultAddress) {
    return NextResponse.json({ error: "This fund has no on-chain vault yet" }, { status: 400 })
  }

  // Ensure the allocator has enough active allocation to withdraw.
  const mine = (await store.allocations.list()).filter(
    (a) => a.fundId === fund.id && a.allocatorUserId === session.user.id && a.status !== "withdrawn",
  )
  const available = mine.reduce((s, a) => s + Number(a.amountUsdc), 0)
  if (amount > available) {
    return NextResponse.json({ error: `You can withdraw up to ${available.toFixed(2)} USDC` }, { status: 400 })
  }

  const created = await store.withdrawals.create({
    fundId: fund.id,
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    keetaAddress,
    amountUsdc: amount,
    status: "pending",
    processedAt: null,
    txHash: null,
    note: "Timelocked until keeper review",
  })
  return NextResponse.json({ ok: true, withdrawal: created }, { status: 201 })
}
