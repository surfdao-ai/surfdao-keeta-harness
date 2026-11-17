"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Disclaimer from "@/components/disclaimer"
import { AGENT_PERSONAS, DEFAULT_MANDATE, DEFAULT_RISK_CONFIG } from "@/lib/agents/personas"
import { Flag, Wallet, ShieldCheck, Sparkles, Check, AlertCircle, Coins, Globe, KeyRound } from "lucide-react"

const MAX = 100
type Asset = { symbol: string; name: string; address: string | null; decimals: number; color: string; priceUsd: number }

const STEPS = ["Identity", "Agents", "Assets", "Harness", "Publish"] as const

export default function NewFundPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [universe, setUniverse] = React.useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = React.useState(true)
  const [publish, setPublish] = React.useState(true)
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    keetaWalletAddress: "",
    agents: DEFAULT_MANDATE.agents.map((a) => ({ ...a })),
    assets: [] as { symbol: string; name: string; address: string | null; color: string; weight: number }[],
    maxPositionPct: DEFAULT_RISK_CONFIG.maxPositionPct,
    maxDrawdownPct: DEFAULT_RISK_CONFIG.maxDrawdownPct,
    provider: "simulated",
    model: "surfdao-paper",
    endpoint: "",
    apiKey: "",
  })

  React.useEffect(() => {
    fetch("/api/assets")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((j) => {
        setUniverse(j.assets ?? [])
        // Sensible default: stablebase + Keeta, 50/50
        const defaults = (j.assets ?? []).filter((a: Asset) => ["USDC", "KTA"].includes(a.symbol)).slice(0, 2)
        if (defaults.length) {
          const w = Math.floor(MAX / defaults.length)
          setForm((f) => ({
            ...f,
            assets: defaults.map((a: Asset, i: number) => ({
              symbol: a.symbol, name: a.name, address: a.address, color: a.color,
              weight: i === defaults.length - 1 ? MAX - w * (defaults.length - 1) : w,
            })),
          }))
        }
      })
      .catch(() => {})
      .finally(() => setAssetsLoading(false))
  }, [])

  const agentTotal = form.agents.reduce((s, a) => s + a.weight, 0)
  const assetTotal = form.assets.reduce((s, a) => s + a.weight, 0)
  const agentsValid = agentTotal === MAX
  const assetsValid = assetTotal === MAX && form.assets.length > 0
  const inferenceValid = form.provider === "simulated" || (
    /^https:\/\//i.test(form.endpoint) && form.apiKey.length >= 4
  )

  function updateAgentWeight(id: string, requested: number) {
    setForm((f) => {
      const others = f.agents.reduce((s, a) => (a.id === id ? s : s + a.weight), 0)
      const weight = Math.min(Math.max(0, Math.round(requested)), Math.max(0, MAX - others))
      return { ...f, agents: f.agents.map((a) => (a.id === id ? { ...a, weight } : a)) }
    })
  }
  function toggleAgent(id: string) {
    setForm((f) => {
      const exists = f.agents.find((a) => a.id === id)
      if (exists) return { ...f, agents: f.agents.filter((a) => a.id !== id) }
      const others = f.agents.reduce((s, a) => s + a.weight, 0)
      if (others >= MAX) {
        toast({ title: "Weight limit reached", description: "Lower another agent first.", variant: "destructive" })
        return f
      }
      return { ...f, agents: [...f.agents, { id, weight: Math.min(20, MAX - others) }] }
    })
  }
  function updateAssetWeight(symbol: string, requested: number) {
    setForm((f) => {
      const others = f.assets.reduce((s, a) => (a.symbol === symbol ? s : s + a.weight), 0)
      const weight = Math.min(Math.max(0, Math.round(requested)), Math.max(0, MAX - others))
      return { ...f, assets: f.assets.map((a) => (a.symbol === symbol ? { ...a, weight } : a)) }
    })
  }
  function toggleAsset(asset: Asset) {
    setForm((f) => {
      const exists = f.assets.find((a) => a.symbol === asset.symbol)
      if (exists) return { ...f, assets: f.assets.filter((a) => a.symbol !== asset.symbol) }
      const others = f.assets.reduce((s, a) => s + a.weight, 0)
      if (others >= MAX) {
        toast({ title: "Asset limit reached", description: "Lower another asset first.", variant: "destructive" })
        return f
      }
      return { ...f, assets: [...f.assets, { symbol: asset.symbol, name: asset.name, address: asset.address, color: asset.color, weight: Math.min(25, MAX - others) }] }
    })
  }

  function nextStep() {
    if (step === 1 && !form.name.trim()) {
      toast({ title: "Name required", description: "Give your board a name.", variant: "destructive" }); return
    }
    if (step === 2 && !agentsValid) {
      toast({ title: "Agent weights must total 100%", description: `Currently ${agentTotal}%.`, variant: "destructive" }); return
    }
    if (step === 3 && !assetsValid) {
      toast({ title: "Asset weights must total 100%", description: `Currently ${assetTotal}%.`, variant: "destructive" }); return
    }
    if (step === 4 && !inferenceValid) {
      toast({ title: "Incomplete harness", description: "Enter a public https endpoint and an API key.", variant: "destructive" }); return
    }
    setStep((s) => Math.min(5, s + 1))
  }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          keetaWalletAddress: form.keetaWalletAddress || null,
          mandate: { agents: form.agents },
          riskConfig: { ...DEFAULT_RISK_CONFIG, maxPositionPct: form.maxPositionPct, maxDrawdownPct: form.maxDrawdownPct },
          assets: form.assets,
          inferenceConfig: {
            provider: form.provider,
            model: form.model,
            endpoint: form.provider === "simulated" ? "" : form.endpoint,
            apiKey: form.provider === "simulated" ? "" : form.apiKey,
          },
          publish,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Could not create fund")
      if (!json.fund?.slug) throw new Error("Invalid response from server")
      toast({
        title: publish ? "Board published!" : "Draft saved",
        description: publish ? `${form.name} is live on the leaderboard.` : `${form.name} is saved as a draft.`,
      })
      router.push(`/dashboard/funds/${encodeURIComponent(json.fund.slug)}`)
      router.refresh()
    } catch (e: any) {
      toast({ title: "Could not shape board", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-wave-blue/30 bg-wave-blue/10 px-3 py-1 text-xs font-medium text-wave-blue">
          <Sparkles className="h-3 w-3" /> New fund harness
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foam">Shape your board</h1>
        <p className="mt-1 text-foam/80">Define the crew, the Keeta assets, the harness, and publish when ready.</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => i + 1 < step && setStep(i + 1)} className="group text-left">
            <div className={`h-1.5 rounded-full transition-all ${step >= i + 1 ? "bg-gradient-to-r from-wave-blue to-seafoam" : "bg-white/10"}`} />
            <span className={`mt-2 block text-[10px] font-medium sm:text-xs ${step >= i + 1 ? "text-foam/90" : "text-foam/70"}`}>{label}</span>
          </button>
        ))}
      </div>

      <div className="surfboard-card p-6 shadow-xl shadow-black/20 lg:p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue"><Flag className="h-5 w-5" /></div><h2 className="text-xl font-bold text-foam">Fund identity</h2></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foam">Fund name</label><Input placeholder="e.g. Barrel Rider" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foam">Description</label><textarea placeholder="What's your strategy?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex min-h-20 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 py-2 text-sm text-foam placeholder:text-foam/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/60" /></div>
            <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-medium text-foam"><Wallet className="h-4 w-4 text-seafoam" /> Keeta wallet <span className="text-xs font-normal text-foam/70">(optional)</span></label><Input placeholder="keeta_…" value={form.keetaWalletAddress} onChange={(e) => setForm({ ...form, keetaWalletAddress: e.target.value })} /><p className="text-xs text-foam/70">You control this wallet. We never store private keys.</p></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue"><ShieldCheck className="h-5 w-5" /></div><h2 className="text-xl font-bold text-foam">Agent crew</h2></div>
            <p className="text-sm text-foam/80">Strategy-style agents and their weights. Total capped at 100%.</p>
            <div className="space-y-2">
              {AGENT_PERSONAS.map((persona) => {
                const selected = form.agents.find((a) => a.id === persona.id)
                return (
                  <div key={persona.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${selected ? "border-seafoam/40 bg-seafoam/5" : "border-white/10 bg-white/[0.02]"}`}>
                    <button onClick={() => toggleAgent(persona.id)} aria-label={`Toggle ${persona.name}`}><Badge variant={selected ? "success" : "outline"}>{selected ? <Check className="h-3 w-3" /> : "+"}</Badge></button>
                    <div className="min-w-0 flex-1"><div className={`text-sm font-semibold ${persona.color}`}>{persona.name}</div><div className="text-xs text-foam/70">{persona.style}</div></div>
                    {selected && (<div className="flex items-center gap-2"><input type="range" min="0" max="100" value={selected.weight} onChange={(e) => updateAgentWeight(persona.id, Number(e.target.value))} className="w-20 accent-seafoam sm:w-24" aria-label={`${persona.name} weight`} /><span className="w-9 text-right text-sm font-semibold text-foam">{selected.weight}%</span></div>)}
                  </div>
                )
              })}
            </div>
            <WeightBar label="Total agent weight" value={agentTotal} valid={agentsValid} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seafoam/15 text-seafoam"><Coins className="h-5 w-5" /></div><h2 className="text-xl font-bold text-foam">Keeta asset universe</h2></div>
            <p className="text-sm text-foam/80">Pick the assets your agents may allocate into. Sourced from the Keeta registry (KeeSpecs) with a curated fallback. Weights must total 100%.</p>
            {assetsLoading ? <p className="text-sm text-foam/70">Loading available assets…</p> : (
              <div className="space-y-2">
                {universe.map((asset) => {
                  const selected = form.assets.find((a) => a.symbol === asset.symbol)
                  return (
                    <div key={asset.symbol} className={`flex items-center gap-3 rounded-xl border p-3 transition ${selected ? "border-seafoam/40 bg-seafoam/5" : "border-white/10 bg-white/[0.02]"}`}>
                      <button onClick={() => toggleAsset(asset)} aria-label={`Toggle ${asset.symbol}`}><Badge variant={selected ? "success" : "outline"}>{selected ? <Check className="h-3 w-3" /> : "+"}</Badge></button>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: asset.color }} />
                      <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-foam">{asset.symbol} <span className="font-normal text-foam/70">{asset.name}</span></div><div className="truncate text-[10px] text-foam/60">{asset.address ? `${asset.address.slice(0, 16)}…` : "Keeta base asset"} · ${asset.priceUsd.toFixed(2)}</div></div>
                      {selected && (<div className="flex items-center gap-2"><input type="range" min="0" max="100" value={selected.weight} onChange={(e) => updateAssetWeight(asset.symbol, Number(e.target.value))} className="w-20 accent-seafoam sm:w-24" aria-label={`${asset.symbol} weight`} /><span className="w-9 text-right text-sm font-semibold text-foam">{selected.weight}%</span></div>)}
                    </div>
                  )
                })}
              </div>
            )}
            <WeightBar label="Total asset weight" value={assetTotal} valid={assetsValid} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foam">Fund harness</h2>
            <p className="text-sm text-foam/80">Risk guardrails and the inference API that powers your agents.</p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foam">Max position <span className="text-seafoam">{form.maxPositionPct}%</span></label>
              <input type="range" min="5" max="50" value={form.maxPositionPct} onChange={(e) => setForm({ ...form, maxPositionPct: Number(e.target.value) })} className="w-full accent-seafoam" />
              <label className="block text-sm font-medium text-foam">Max drawdown <span className="text-seafoam">{form.maxDrawdownPct}%</span></label>
              <input type="range" min="5" max="40" value={form.maxDrawdownPct} onChange={(e) => setForm({ ...form, maxDrawdownPct: Number(e.target.value) })} className="w-full accent-seafoam" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Inference provider</label>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="flex h-10 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 text-sm text-foam">
                <option value="simulated">Simulated (built-in paper harness)</option>
                <option value="openai">OpenAI-compatible (your endpoint)</option>
                <option value="anthropic">Anthropic-compatible (your endpoint)</option>
              </select>
            </div>
            {form.provider !== "simulated" && (
              <div className="space-y-4 rounded-xl border border-wave-blue/25 bg-wave-blue/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-wave-blue"><KeyRound className="h-4 w-4" /> Your inference API</div>
                <div className="space-y-2"><label className="text-xs font-medium text-foam/80">Endpoint URL (public https)</label><Input placeholder="https://api.example.com/v1/chat/completions" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><label className="text-xs font-medium text-foam/80">API key</label><Input type="password" placeholder="sk-…" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-xs font-medium text-foam/80">Model</label><Input placeholder="gpt-4o-mini" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                </div>
                <div className="flex gap-2 text-xs text-foam/80"><AlertCircle className="h-4 w-4 shrink-0 text-seafoam" /><span>Endpoints are SSRF-checked (https + public hosts only). Keys are AES-256-GCM encrypted server-side and never returned to the browser.</span></div>
              </div>
            )}
            {form.provider === "simulated" && <div className="rounded-xl border border-wave-blue/25 bg-wave-blue/5 p-3 text-xs text-foam/80"><strong className="text-wave-blue">Built-in harness:</strong> deterministic paper agent theses. No external API needed. You can switch to your own endpoint later from the fund page.</div>}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seafoam/15 text-seafoam"><Globe className="h-5 w-5" /></div><h2 className="text-xl font-bold text-foam">Publish</h2></div>
            <button onClick={() => setPublish(!publish)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${publish ? "border-seafoam/50 bg-seafoam/10" : "border-white/15 bg-white/[0.02]"}`}>
              <div><div className="text-sm font-semibold text-foam">Public leaderboard</div><div className="text-xs text-foam/70">{publish ? "Anyone can see this fund and allocate into it." : "Draft — only you can see it."}</div></div>
              <Badge variant={publish ? "success" : "warning"}>{publish ? "PUBLIC" : "DRAFT"}</Badge>
            </button>
            <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-ocean-900/30 px-4">
              {[
                ["Fund", form.name], ["Agents", `${form.agents.length} (${agentTotal}%)`],
                ["Assets", form.assets.map((a) => a.symbol).join(", ") || "—"],
                ["Asset weight", `${assetTotal}%`], ["Harness", form.provider === "simulated" ? "Paper simulator" : `${form.provider} (custom)`],
                ["Visibility", publish ? "Public" : "Draft"],
              ].map(([l, v]) => <div key={l} className="flex justify-between py-3 text-sm"><span className="text-foam/80">{l}</span><span className="text-right font-semibold text-foam">{v}</span></div>)}
            </div>
            <Disclaimer variant="short" />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading}>Back</Button>
        {step < 5 ? <Button onClick={nextStep}>Continue</Button> : (
          <Button onClick={submit} disabled={loading || !agentsValid || !assetsValid || !inferenceValid}>
            {loading ? "Shaping…" : publish ? "Shape & publish" : "Save draft"}
          </Button>
        )}
      </div>
    </div>
  )
}

function WeightBar({ label, value, valid }: { label: string; value: number; valid: boolean }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${valid ? "border-seafoam/40 bg-seafoam/10 text-seafoam" : "border-sunset/40 bg-sunset/10 text-sunset"}`}>
        <span className="flex items-center gap-2">{valid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{label}</span>
        <span>{value}% / 100%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${valid ? "bg-seafoam" : "bg-sunset"}`} style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  )
}
