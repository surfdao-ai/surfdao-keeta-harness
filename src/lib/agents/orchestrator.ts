import { AGENT_PERSONAS, DEFAULT_MANDATE, type AgentPersona } from "./personas"

/* --------------------------------------------------------------------------
   SurfDAO.ai — Agent orchestrator

   Runs the fund's chosen agent pipeline against market data + portfolio and
   aggregates votes into a decision. When no real inference endpoint is
   configured, it runs a deterministic paper simulation so the full loop
   works out of the box. Swap in a real provider (OpenAI, Anthropic, etc.)
   behind the `inferenceConfig.endpoint` / `apiKey`.
--------------------------------------------------------------------------- */

export type MarketSnapshot = {
  prices: Record<string, number>
  changes24h: Record<string, number>
  volume: Record<string, number>
  asOf: string
}

export type Portfolio = {
  cash: number
  positions: Record<string, { amount: number; avgPrice: number }>
}

export type AgentVote = {
  agentId: string
  agentName: string
  score: number
  thesis: string
  risks: string[]
  suggestedWeight: number
}

export type OrchestrationResult = {
  mode: "simulated" | "live"
  votes: AgentVote[]
  weights: Record<string, number>
  assetWeights: Record<string, number>
  summary: string
  checksPassed: boolean
}

/* Deterministic pseudo-score so paper trades are reproducible but varied. */
function seededScore(seed: string): number {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) % 101
}

function personaBias(agentId: string): number {
  const b: Record<string, number> = {
    "deep-value": 5,
    "intrinsic-value": 0,
    "quality-moat": 8,
    "cash-flow-activist": -5,
    "disruptive-growth": -10,
    "contrarian-value": -8,
    "risk-manager": -3,
    "portfolio-manager": 0,
  }
  return b[agentId] ?? 0
}

function simulateVote(
  persona: AgentPersona,
  data: string,
  portfolio: Portfolio,
  market: MarketSnapshot,
  weightHint: number,
): AgentVote {
  const seed = `${persona.id}:${data}:${JSON.stringify(portfolio)}`
  let score = seededScore(seed) + personaBias(persona.id)
  score = Math.min(100, Math.max(0, score))

  // Risk manager is more conservative
  if (persona.id === "risk-manager") score = Math.min(score, 75)

  const thesis = `${persona.name} evaluates the current regime (${market.asOf}). `
  const risks = ["Market volatility", "Concentration risk"]
  const suggestedWeight = Math.round(
    (score / 100) * weightHint,
  )

  return {
    agentId: persona.id,
    agentName: persona.name,
    score,
    thesis,
    risks,
    suggestedWeight: Math.min(100, Math.max(0, suggestedWeight)),
  }
}

export async function orchestrate({
  mandate = DEFAULT_MANDATE,
  riskConfig,
  portfolio,
  market,
  assets,
  inferenceConfig,
}: {
  mandate?: typeof DEFAULT_MANDATE
  riskConfig?: Record<string, unknown>
  portfolio?: Portfolio
  market?: MarketSnapshot
  assets?: string[]
  inferenceConfig?: { provider: string; endpoint?: string; apiKey?: string; encryptedApiKey?: string }
}): Promise<OrchestrationResult> {
  const dataBlock = JSON.stringify({ portfolio, market, riskConfig }, null, 2)
  const votes: AgentVote[] = []

  if (inferenceConfig?.provider !== "simulated" && inferenceConfig?.endpoint) {
    try {
      const apiKey = inferenceConfig.encryptedApiKey
        ? decryptSecret(inferenceConfig.encryptedApiKey) ?? undefined
        : inferenceConfig.apiKey
      const liveVotes = await runLiveInference(
        {
          provider: inferenceConfig.provider,
          model: (inferenceConfig as any).model ?? "default",
          endpoint: inferenceConfig.endpoint ?? "",
          apiKey,
        },
        dataBlock,
        mandate,
      )
      return { mode: "live", ...aggregate(liveVotes, mandate), assetWeights: computeAssetWeights(assets, market) }
    } catch (e) {
      console.warn("[surfdao] live inference failed, falling back to simulated:", e)
    }
  }

  // Paper / simulated mode
  const marketSnapshot: MarketSnapshot = market ?? {
    prices: { BTC: 67000, ETH: 3500, SOL: 140, KTA: 1.2 },
    changes24h: { BTC: 2.4, ETH: 1.1, SOL: 5.2, KTA: 0.3 },
    volume: { BTC: 28e9, ETH: 12e9, SOL: 2e9, KTA: 5e6 },
    asOf: new Date().toISOString(),
  }

  for (const agentRef of mandate.agents) {
    const persona = AGENT_PERSONAS.find((a) => a.id === agentRef.id)
    if (!persona) continue
    votes.push(simulateVote(persona, dataBlock, portfolio ?? { cash: 10000, positions: {} }, marketSnapshot, agentRef.weight ?? 20))
  }

  return { mode: "simulated", ...aggregate(votes, mandate), assetWeights: computeAssetWeights(assets, marketSnapshot) }
}

/* Target weights across the fund's chosen Keeta assets. Momentum + deterministic
   noise, normalized to 100%, always respecting the selected universe. */
function computeAssetWeights(
  assets: string[] | undefined,
  market: MarketSnapshot | undefined,
): Record<string, number> {
  const symbols = assets?.length ? assets : Object.keys(market?.prices ?? { USDC: 1, KTA: 1 })
  if (!symbols.length) return {}
  const raw = symbols.map((s) => {
    const change = market?.changes24h?.[s] ?? 0
    const noise = (seededScore(`${s}:${market?.asOf ?? "paper"}`) - 50) / 50
    return Math.max(5, 50 + change * 4 + noise * 20)
  })
  const total = raw.reduce((a, b) => a + b, 0)
  const weights: Record<string, number> = {}
  symbols.forEach((s, i) => { weights[s] = Math.round((raw[i] / total) * 1000) / 10 })
  return weights
}

function aggregate(votes: AgentVote[], mandate: typeof DEFAULT_MANDATE) {
  const weights: Record<string, number> = {}
  let totalScore = 0
  for (const v of votes) totalScore += v.score

  for (const v of votes) {
    const agentRef = mandate.agents.find((a) => a.id === v.agentId)
    const weight = agentRef ? agentRef.weight : 20
    // score-weighted share of the agent's mandate weight
    const share = totalScore > 0 ? v.score / totalScore : 1 / votes.length
    weights[v.agentId] = Math.round(weight * share * 100) / 100
  }

  // Normalize to exactly 100: round first, then absorb any remainder into the
  // largest weight so displayed allocations never sum to 99 or 101.
  const wSum = Object.values(weights).reduce((a, b) => a + b, 0)
  if (wSum > 0) {
    const keys = Object.keys(weights)
    keys.forEach((k) => { weights[k] = Math.round((weights[k] / wSum) * 100) })
    const diff = 100 - keys.reduce((a, k) => a + weights[k], 0)
    if (diff !== 0) {
      const largest = keys.reduce((best, k) => (weights[k] > weights[best] ? k : best), keys[0])
      weights[largest] += diff
    }
  }

  const avgScore = votes.length ? (votes.reduce((a, b) => a + b.score, 0) / votes.length) : 0
  const checksPassed = avgScore >= 40
  const summary = `Aggregated ${votes.length} analyst votes (avg score ${avgScore.toFixed(0)}/100). ${
    checksPassed ? "Wave conditions: clear — proceed." : "Wave conditions: caution — review risks before deploying capital."
  }`

  return { votes, weights, summary, checksPassed }
}

import { isSafeEndpoint } from "@/lib/validate"
import { decryptSecret } from "@/lib/inference-crypto"

/* Provider-agnostic call. OpenAI-compatible endpoints (OpenRouter, xAI/Grok,
   Groq, Together, DeepSeek, Mistral, OpenAI…) use chat/completions; Anthropic
   uses the messages API. Any other host gets a generic JSON passthrough. */
async function runLiveInference(
  config: { provider: string; model: string; endpoint: string; apiKey?: string },
  dataBlock: string,
  mandate: typeof DEFAULT_MANDATE,
): Promise<AgentVote[]> {
  if (!isSafeEndpoint(config.endpoint)) throw new Error("Unsafe inference endpoint")
  const p = config.provider.toLowerCase()
  const isAnthropic = p.includes("anthropic") || config.endpoint.includes("/v1/messages")
  const system = "You are a hedge-fund analyst harness. Return ONLY strict JSON: { \"votes\": [{\"agentId\",\"agentName\",\"score\",\"thesis\",\"risks\",\"suggestedWeight\"}] }"
  const user = `Agents: ${JSON.stringify(mandate.agents)}\n\nData:\n${dataBlock}`

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  let body: Record<string, unknown>
  let url = config.endpoint

  if (isAnthropic) {
    headers["x-api-key"] = config.apiKey ?? ""
    headers["anthropic-version"] = "2023-06-01"
    if (!config.endpoint.includes("/messages")) {
      url = config.endpoint.replace(/\/$/, "") + "/messages"
    }
    body = {
      model: config.model,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }
  } else {
    headers.Authorization = `Bearer ${config.apiKey ?? ""}`
    if (!config.endpoint.includes("/chat/completions")) {
      // Common base URLs: append the standard path when it looks like a base.
      url = config.endpoint.replace(/\/$/, "") + "/chat/completions"
    }
    body = {
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`inference ${res.status}`)
  const json: any = await res.json()

  const raw = json.votes ?? json.choices?.[0]?.message?.content ?? json.content
  let parsed = raw
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw) } catch { throw new Error("Inference response was not valid JSON") }
  }
  const votes = Array.isArray(parsed) ? parsed : parsed?.votes
  if (!Array.isArray(votes)) throw new Error("Inference response did not contain votes")
  return votes as AgentVote[]
}
