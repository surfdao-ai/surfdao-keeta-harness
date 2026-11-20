import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { publicFund } from "@/lib/fund-helpers"
import { getApiUser } from "@/lib/auth"
import { assertSameOrigin } from "@/lib/validate"
import { normalizeInferenceConfig } from "@/lib/inference-config"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  // Private (unpublished) funds are only readable by their owner.
  if (!fund.isPublic) {
    const session = await getApiUser()
    if (session?.user.id !== fund.ownerId) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }
  }
  const sessions = await store.fundSessions.byFund(fund.id)
  const allocations = await store.allocations.byFund(fund.id)
  const aum = allocations.reduce((sum, a) => sum + Number(a.amountUsdc), 0)
  const latest = sessions[0]
  return NextResponse.json({
    fund: publicFund(fund),
    sessions,
    allocations,
    aum,
    latestNav: latest?.nav ?? null,
  })
}

/* Publish / unpublish a fund. Only the owner may change visibility. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
  if (fund.ownerId !== session.user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body.isPublic === "boolean") {
    updates.isPublic = body.isPublic
    updates.publishedAt = body.isPublic ? new Date().toISOString() : null
  }
  if (typeof body.vaultAddress === "string") {
    updates.vaultAddress = body.vaultAddress.startsWith("keeta_") ? body.vaultAddress.slice(0, 128) : null
  }
  if (typeof body.keetaWalletAddress === "string" || body.keetaWalletAddress === null) {
    const w = body.keetaWalletAddress
    updates.keetaWalletAddress = typeof w === "string" && w.startsWith("keeta_") ? w.slice(0, 128) : null
  }
  // Creator can switch to any inference provider/model/endpoint after creation.
  if (body.inferenceConfig && typeof body.inferenceConfig === "object") {
    const normalized = normalizeInferenceConfig(
      body.inferenceConfig,
      fund.inferenceConfig as any,
    )
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 })
    updates.inferenceConfig = normalized.config
  }
  if (body.executionMode === "live" || body.executionMode === "paper") {
    if (body.executionMode === "live") {
      const { liveReadiness } = await import("@/lib/live-mode")
      const candidate = { ...fund, ...updates } as typeof fund
      const readiness = liveReadiness(candidate)
      if (!readiness.canEnable) {
        return NextResponse.json({
          error: "Live mode prerequisites are not met",
          checks: readiness.checks,
        }, { status: 400 })
      }
      if (body.acknowledgeRisk !== true) {
        return NextResponse.json({ error: "You must acknowledge the risks" }, { status: 400 })
      }
    }
    updates.executionMode = body.executionMode
  }
  const updated = await store.funds.update(fund.id, updates as any)
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 })
  const { rememberFund } = await import("@/lib/db/schema")
  await rememberFund(updated)
  return NextResponse.json({ ok: true, fund: publicFund(updated) })
}
