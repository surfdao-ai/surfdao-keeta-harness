import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { publicFund } from "@/lib/fund-helpers"
import { getApiUser } from "@/lib/auth"
import { assertSameOrigin } from "@/lib/validate"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
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
  const isPublic = body.isPublic === true
  const updated = await store.funds.update(fund.id, {
    isPublic,
    publishedAt: isPublic ? new Date().toISOString() : null,
  })
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 })
  const { rememberFund } = await import("@/lib/db/schema")
  await rememberFund(updated)
  return NextResponse.json({ ok: true, fund: publicFund(updated) })
}
