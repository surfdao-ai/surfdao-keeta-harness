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
    graham: 5,
    damodaran: 0,
    munger: 8,
    ackman: -5,
    wood: -10,
    burry: -8,
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
  inferenceConfig,
}: {
  mandate?: typeof DEFAULT_MANDATE
  riskConfig?: Record<string, unknown>
  portfolio?: Portfolio
  market?: MarketSnapshot
  inferenceConfig?: { provider: string; endpoint: string; apiKey?: string }
}): Promise<OrchestrationResult> {
  const dataBlock = JSON.stringify({ portfolio, market, riskConfig }, null, 2)
  const votes: AgentVote[] = []

  if (inferenceConfig?.provider !== "simulated" && inferenceConfig?.endpoint) {
    try {
      const liveVotes = await runLiveInference(inferenceConfig, dataBlock, mandate)
      return { mode: "live", ...aggregate(liveVotes, mandate) }
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

  return { mode: "simulated", ...aggregate(votes, mandate) }
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

  // normalize to 100
  const wSum = Object.values(weights).reduce((a, b) => a + b, 0)
  for (const k of Object.keys(weights)) weights[k] = Math.round((weights[k] / wSum) * 100)

  const avgScore = votes.length ? (votes.reduce((a, b) => a + b.score, 0) / votes.length) : 0
  const checksPassed = avgScore >= 40
  const summary = `Aggregated ${votes.length} analyst votes (avg score ${avgScore.toFixed(0)}/100). ${
    checksPassed ? "Wave conditions: clear — proceed." : "Wave conditions: caution — review risks before deploying capital."
  }`

  return { votes, weights, summary, checksPassed }
}

/* Placeholder for a real provider call. Implement against your endpoint. */
async function runLiveInference(
  config: { provider: string; endpoint: string; apiKey?: string },
  dataBlock: string,
  mandate: typeof DEFAULT_MANDATE,
): Promise<AgentVote[]> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({ provider: config.provider, data: dataBlock, mandate }),
  })
  if (!res.ok) throw new Error(`inference ${res.status}`)
  const json = await res.json()
  return json.votes ?? []
}
