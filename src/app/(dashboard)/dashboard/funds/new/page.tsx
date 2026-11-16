"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Disclaimer from "@/components/disclaimer"
import { AGENT_PERSONAS, DEFAULT_MANDATE, DEFAULT_RISK_CONFIG } from "@/lib/agents/personas"
import { Flag, Wallet, ShieldCheck } from "lucide-react"

export default function NewFundPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    keetaWalletAddress: "",
    agents: DEFAULT_MANDATE.agents.map((a) => ({ ...a })),
    maxPositionPct: DEFAULT_RISK_CONFIG.maxPositionPct,
    maxDrawdownPct: DEFAULT_RISK_CONFIG.maxDrawdownPct,
    inferenceProvider: "simulated",
  })

  const totalWeight = form.agents.reduce((sum, a) => sum + a.weight, 0)

  function updateWeight(id: string, weight: number) {
    setForm((f) => ({
      ...f,
      agents: f.agents.map((a) => (a.id === id ? { ...a, weight } : a)),
    }))
  }

  function toggleAgent(id: string) {
    setForm((f) => {
      const exists = f.agents.find((a) => a.id === id)
      if (exists) return { ...f, agents: f.agents.filter((a) => a.id !== id) }
      return { ...f, agents: [...f.agents, { id, weight: 20 }] }
    })
  }

  async function submit() {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Give your board a name.", variant: "destructive" })
      return
    }
    if (totalWeight !== 100) {
      toast({ title: "Weights must sum to 100", description: `Currently ${totalWeight}%.`, variant: "destructive" })
      return
    }
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
          riskConfig: {
            ...DEFAULT_RISK_CONFIG,
            maxPositionPct: form.maxPositionPct,
            maxDrawdownPct: form.maxDrawdownPct,
          },
          inferenceConfig: { provider: form.inferenceProvider, model: "surfdao-paper" },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create fund")
      toast({ title: "Board shaped!", description: `${form.name} is ready to ride.` })
      router.push(`/dashboard/funds/${json.fund.slug}`)
      router.refresh()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Try again", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foam">Shape your board</h1>
        <p className="text-foam/60 mt-1">Configure your fund, agents, and risk. You can run paper sessions immediately.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {["Identity", "Agents", "Risk", "Review"].map((label, i) => (
          <div key={label} className={`flex-1 h-1 rounded-full ${step >= i + 1 ? "bg-seafoam" : "bg-white/10"}`} />
        ))}
      </div>

      <div className="surfboard-card p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="h-5 w-5 text-wave-blue" />
              <h2 className="text-xl font-bold text-foam">Fund identity</h2>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Fund name</label>
              <Input
                placeholder="e.g. Barrel Rider"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Description</label>
              <textarea
                placeholder="What's your strategy?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foam placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Keeta wallet address <span className="text-foam/40 text-xs">(optional)</span>
              </label>
              <Input
                placeholder="keeta_…"
                value={form.keetaWalletAddress}
                onChange={(e) => setForm({ ...form, keetaWalletAddress: e.target.value })}
              />
              <p className="text-xs text-foam/40">You control this wallet. We never store your private keys.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-wave-blue" />
              <h2 className="text-xl font-bold text-foam">Agent crew</h2>
            </div>
            <p className="text-sm text-foam/60">Select investor-persona agents and set their weights. Total must equal 100%.</p>
            <div className="space-y-2">
              {AGENT_PERSONAS.map((persona) => {
                const selected = form.agents.find((a) => a.id === persona.id)
                return (
                  <div key={persona.id} className={`flex items-center gap-3 p-3 rounded-xl border transition ${selected ? "border-seafoam/40 bg-seafoam/5" : "border-white/5 bg-white/2"}`}>
                    <button onClick={() => toggleAgent(persona.id)} className="shrink-0">
                      <Badge variant={selected ? "success" : "outline"}>{selected ? "✓" : "+"}</Badge>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${persona.color}`}>{persona.name}</div>
                      <div className="text-xs text-foam/50">{persona.style}</div>
                    </div>
                    {selected && (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selected.weight}
                          onChange={(e) => updateWeight(persona.id, Number(e.target.value))}
                          className="w-24 accent-seafoam"
                        />
                        <span className="text-sm font-medium text-foam w-8 text-right">{selected.weight}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className={`text-sm font-medium ${totalWeight === 100 ? "text-seafoam" : "text-sunset"}`}>
              Total weight: {totalWeight}%
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-foam">Risk parameters</h2>
            <p className="text-sm text-foam/60">Set guardrails for your agent crew.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Max position size: {form.maxPositionPct}%</label>
              <input type="range" min="5" max="50" value={form.maxPositionPct} onChange={(e) => setForm({ ...form, maxPositionPct: Number(e.target.value) })} className="w-full accent-seafoam" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Max drawdown: {form.maxDrawdownPct}%</label>
              <input type="range" min="5" max="40" value={form.maxDrawdownPct} onChange={(e) => setForm({ ...form, maxDrawdownPct: Number(e.target.value) })} className="w-full accent-seafoam" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Inference endpoint</label>
              <select
                value={form.inferenceProvider}
                onChange={(e) => setForm({ ...form, inferenceProvider: e.target.value })}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm text-foam"
              >
                <option value="simulated">Simulated (paper trading)</option>
                <option value="openai">OpenAI-compatible</option>
                <option value="anthropic">Anthropic-compatible</option>
              </select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-foam">Review & shape</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-foam/50">Name</span><span className="text-foam font-medium">{form.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-foam/50">Agents</span><span className="text-foam font-medium">{form.agents.length}</span></div>
              <div className="flex justify-between"><span className="text-foam/50">Total weight</span><span className={totalWeight === 100 ? "text-seafoam font-medium" : "text-sunset font-medium"}>{totalWeight}%</span></div>
              <div className="flex justify-between"><span className="text-foam/50">Max position</span><span className="text-foam font-medium">{form.maxPositionPct}%</span></div>
              <div className="flex justify-between"><span className="text-foam/50">Max drawdown</span><span className="text-foam font-medium">{form.maxDrawdownPct}%</span></div>
              <div className="flex justify-between"><span className="text-foam/50">Status</span><span className="text-seafoam font-medium">Paper</span></div>
            </div>
            <Disclaimer variant="short" />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button onClick={submit} disabled={loading || totalWeight !== 100}>
            {loading ? "Shaping…" : "Shape board"}
          </Button>
        )}
      </div>
    </div>
  )
}
