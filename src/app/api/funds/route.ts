import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberFund } from "@/lib/db/schema"
import { DEFAULT_MANDATE, DEFAULT_RISK_CONFIG, DEFAULT_INFERENCE_CONFIG } from "@/lib/agents/personas"
import { safeText, safeJson, assertSameOrigin } from "@/lib/validate"

export async function GET() {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const funds = await store.funds.list()
  return NextResponse.json({ funds })
}

export async function POST(req: Request) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const name = safeText(body.name, 60)
  if (!name) {
    return NextResponse.json({ error: "name required (max 60 characters)" }, { status: 400 })
  }
  const description = safeText(body.description, 400) ?? ""
  const keetaWalletAddress = safeText(body.keetaWalletAddress, 128) ?? null

  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) slug = `board-${Date.now().toString(36)}`
  const existing = await store.funds.findBySlug(slug)
  if (existing) {
    return NextResponse.json({ error: "A fund with that name already exists" }, { status: 409 })
  }

  const fund = await store.funds.create({
    ownerId: session.user.id,
    name,
    description,
    slug,
    status: "paper",
    mandate: safeJson(body.mandate, DEFAULT_MANDATE),
    riskConfig: safeJson(body.riskConfig, DEFAULT_RISK_CONFIG),
    inferenceConfig: safeInference(body.inferenceConfig),
    keetaWalletAddress,
    isPublic: true,
  })
  await rememberFund(fund)
  return NextResponse.json({ fund }, { status: 201 })
}

/* Only allow known providers — never accept a user-supplied URL (SSRF). */
function safeInference(value: unknown) {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const provider = ["simulated", "openai", "anthropic"].includes(String(obj.provider))
    ? String(obj.provider)
    : "simulated"
  return { provider, model: safeText(obj.model, 60) ?? "surfdao-paper", endpoint: "", apiKey: "" }
}
