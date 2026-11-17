import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store, rememberFund, type Fund } from "@/lib/db/schema"
import { DEFAULT_MANDATE, DEFAULT_RISK_CONFIG, DEFAULT_INFERENCE_CONFIG } from "@/lib/agents/personas"
import { safeText, safeJson, assertSameOrigin, isSafeEndpoint } from "@/lib/validate"
import { encryptSecret } from "@/lib/inference-crypto"
import { getAssetUniverse } from "@/lib/assets/keeta-assets"
import { publicFund } from "@/lib/fund-helpers"

export async function GET() {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const funds = await store.funds.list()
  return NextResponse.json({ funds: funds.map(publicFund) })
}

export async function POST(req: Request) {
  const session = await getApiUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  const body = await req.json().catch(() => ({}))

  const name = safeText(body.name, 60)
  if (!name) return NextResponse.json({ error: "name required (max 60 characters)" }, { status: 400 })
  const description = safeText(body.description, 400) ?? ""
  const keetaWalletAddress = safeText(body.keetaWalletAddress, 128) ?? null

  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) slug = `board-${Date.now().toString(36)}`
  if (await store.funds.findBySlug(slug)) {
    return NextResponse.json({ error: "A fund with that name already exists" }, { status: 409 })
  }

  // Assets must come from the known Keeta universe, weights capped at 100.
  const universe = await getAssetUniverse()
  const rawAssets = Array.isArray(body.assets) ? body.assets.slice(0, 12) : []
  const assets: Fund["assets"] = []
  let assetTotal = 0
  for (const raw of rawAssets) {
    const symbol = String(raw?.symbol ?? "").toUpperCase().slice(0, 8)
    const match = universe.find((a) => a.symbol === symbol)
    const weight = Math.round(Number(raw?.weight))
    if (!match || !Number.isFinite(weight) || weight <= 0) continue
    if (assetTotal + weight > 100) continue
    assetTotal += weight
    assets.push({
      symbol: match.symbol,
      name: match.name,
      address: match.address,
      weight,
      color: match.color,
    })
  }
  if (assetTotal !== 100) {
    return NextResponse.json({ error: "Asset weights must total 100%" }, { status: 400 })
  }

  const inference = await safeInference(body.inferenceConfig)
  if (!inference.ok) return NextResponse.json({ error: inference.error }, { status: 400 })
  const publish = body.publish !== false

  const fund = await store.funds.create({
    ownerId: session.user.id,
    name,
    description,
    slug,
    status: "paper",
    mandate: safeJson(body.mandate, DEFAULT_MANDATE),
    riskConfig: safeJson(body.riskConfig, DEFAULT_RISK_CONFIG),
    inferenceConfig: inference.config,
    assets,
    keetaWalletAddress,
    isPublic: publish,
    publishedAt: publish ? new Date().toISOString() : null,
  })
  await rememberFund(fund)
  return NextResponse.json({ fund: publicFund(fund) }, { status: 201 })
}

/* Validate + store inference config. The key is encrypted; the URL is SSRF-checked. */
async function safeInference(value: unknown): Promise<
  { ok: true; config: Record<string, unknown> } | { ok: false; error: string }
> {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const provider = ["simulated", "openai", "anthropic"].includes(String(obj.provider))
    ? String(obj.provider)
    : "simulated"

  if (provider === "simulated") {
    return { ok: true, config: { ...DEFAULT_INFERENCE_CONFIG, provider } }
  }

  if (!isSafeEndpoint(obj.endpoint)) {
    return { ok: false, error: "Inference endpoint must be a public https URL" }
  }
  const apiKey = safeText(obj.apiKey, 200)
  if (!apiKey) return { ok: false, error: "An API key is required for a custom inference endpoint" }
  return {
    ok: true,
    config: {
      provider,
      model: safeText(obj.model, 60) ?? "gpt-4o-mini",
      endpoint: obj.endpoint,
      encryptedApiKey: encryptSecret(apiKey),
    },
  }
}
