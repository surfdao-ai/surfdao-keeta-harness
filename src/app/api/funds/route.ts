import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { DEFAULT_MANDATE, DEFAULT_RISK_CONFIG, DEFAULT_INFERENCE_CONFIG } from "@/lib/agents/personas"

export async function GET(req: Request) {
  await requireUser()
  const funds = await store.funds.list()
  return NextResponse.json({ funds })
}

export async function POST(req: Request) {
  const session = await requireUser()
  const body = await req.json().catch(() => ({}))
  const { name, description, mandate, riskConfig, inferenceConfig, keetaWalletAddress } = body
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 })
  }
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  // Always produce a valid, route-safe slug (e.g. names made only of symbols/emoji).
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) slug = `board-${Date.now().toString(36)}`
  const existing = await store.funds.findBySlug(slug)
  if (existing) {
    return NextResponse.json({ error: "A fund with that name already exists" }, { status: 409 })
  }
  const fund = await store.funds.create({
    ownerId: session.user.id,
    name,
    description: description ?? "",
    slug,
    status: "paper",
    mandate: mandate ?? DEFAULT_MANDATE,
    riskConfig: riskConfig ?? DEFAULT_RISK_CONFIG,
    inferenceConfig: inferenceConfig ?? DEFAULT_INFERENCE_CONFIG,
    keetaWalletAddress: keetaWalletAddress ?? null,
    isPublic: true,
  })
  return NextResponse.json({ fund }, { status: 201 })
}
