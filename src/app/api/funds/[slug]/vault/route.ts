import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { assertSameOrigin } from "@/lib/validate"
import {
  createFundVault,
  getVaultBalances,
  scanVaultDeposits,
  explorerUrl,
  keeperConfigured,
} from "@/lib/keeta/vault"

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  const address = (fund as any).vaultAddress ?? null
  const balances = address ? await getVaultBalances(address) : []
  const deposits = address ? await scanVaultDeposits(address, fund.createdAt) : []
  return NextResponse.json({
    address,
    explorerUrl: address ? explorerUrl(address) : null,
    balances,
    deposits,
    keeperConfigured: keeperConfigured(),
    liveEnabled: process.env.LIVE_MODE === "true",
  })
}

/* Owner provisions a real Keeta storage vault for the fund. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (fund.ownerId !== session.user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  if (process.env.LIVE_MODE !== "true") {
    return NextResponse.json({ error: "LIVE_MODE must be enabled on the server first" }, { status: 400 })
  }
  if (!keeperConfigured()) {
    return NextResponse.json({ error: "KEETA_KEEPER_SEED is not configured" }, { status: 400 })
  }
  if ((fund as any).vaultAddress) {
    return NextResponse.json({ error: "Vault already provisioned" }, { status: 409 })
  }
  try {
    const address = await createFundVault(fund.name)
    await store.funds.update(fund.id, { vaultAddress: address } as any)
    return NextResponse.json({
      ok: true,
      address,
      explorerUrl: explorerUrl(address),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create vault" }, { status: 500 })
  }
}
