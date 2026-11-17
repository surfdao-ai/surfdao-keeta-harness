"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Disclaimer from "@/components/disclaimer"
import { AGENT_PERSONAS, DEFAULT_MANDATE, DEFAULT_RISK_CONFIG } from "@/lib/agents/personas"
import { Flag, Wallet, ShieldCheck, Sparkles, Check, AlertCircle } from "lucide-react"

const MAX_WEIGHT = 100

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
  const weightValid = totalWeight === MAX_WEIGHT

  /* Never let the combined weight exceed 100%. */
  function updateWeight(id: string, requested: number) {
    setForm((f) => {
      const current = f.agents.find((a) => a.id === id)?.weight ?? 0
      const othersTotal = f.agents.reduce((s, a) => (a.id === id ? s : s + a.weight), 0)
      const allowed = Math.max(0, MAX_WEIGHT - othersTotal)
      const weight = Math.min(Math.max(0, Math.round(requested)), allowed)
      return { ...f, agents: f.agents.map((a) => (a.id === id ? { ...a, weight } : a)) }
    })
  }

  function toggleAgent(id: string) {
    setForm((f) => {
      const exists = f.agents.find((a) => a.id === id)
      if (exists) return { ...f, agents: f.agents.filter((a) => a.id !== id) }
      const othersTotal = f.agents.reduce((s, a) => s + a.weight, 0)
      if (othersTotal >= MAX_WEIGHT) {
        toast({
          title: "Weight limit reached",
          description: "Lower another agent's weight before adding a new one.",
          variant: "destructive",
        })
        return f
      }
      return { ...f, agents: [...f.agents, { id, weight: Math.min(20, MAX_WEIGHT - othersTotal) }] }
    })
  }

  function nextStep() {
    if (step === 1 && !form.name.trim()) {
      toast({ title: "Name required", description: "Give your board a name.", variant: "destructive" })
      return
    }
    if (step === 2 && !weightValid) {
      toast({
        title: totalWeight > MAX_WEIGHT ? "Weight over 100%" : "Weights must total 100%",
        description: `Current total: ${totalWeight}%.`,
        variant: "destructive",
      })
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }

  async function submit() {
    if (!form.name.trim() || !weightValid) return
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
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to create fund")
      if (!json.fund?.slug) throw new Error("The server returned an invalid fund. Try a different name.")
      toast({ title: "Board shaped!", description: `${form.name} is ready to ride.` })
      router.push(`/dashboard/funds/${encodeURIComponent(json.fund.slug)}`)
      router.refresh()
    } catch (e: any) {
      toast({ title: "Couldn't shape board", description: e?.message ?? "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const steps = ["Identity", "Agents", "Risk", "Review"]

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-wave-blue/30 bg-wave-blue/10 px-3 py-1 text-xs font-medium text-wave-blue">
          <Sparkles className="h-3 w-3" /> New board
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foam">Shape your board</h1>
        <p className="mt-1 text-foam/80">Configure your fund, agents, and risk. You can run paper sessions immediately.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <button key={label} onClick={() => i + 1 < step && setStep(i + 1)} className="group flex-1 text-left">
            <div className={`h-1.5 rounded-full transition-all ${step >= i + 1 ? "bg-gradient-to-r from-wave-blue to-seafoam" : "bg-white/10"}`} />
            <span className={`mt-2 block text-xs font-medium ${step >= i + 1 ? "text-foam/90" : "text-foam/70"}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="surfboard-card p-6 shadow-xl shadow-black/20 lg:p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue">
                <Flag className="h-5 w-5" />
              </div>
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
                className="flex min-h-20 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 py-2 text-sm text-foam placeholder:text-foam/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/60"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foam">
                <Wallet className="h-4 w-4 text-seafoam" /> Keeta wallet address
                <span className="text-xs font-normal text-foam/80">(optional)</span>
              </label>
              <Input
                placeholder="keeta_…"
                value={form.keetaWalletAddress}
                onChange={(e) => setForm({ ...form, keetaWalletAddress: e.target.value })}
              />
              <p className="text-xs text-foam/80">You control this wallet. We never store your private keys.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-foam">Agent crew</h2>
            </div>
            <p className="text-sm text-foam/80">
              Select strategy-style agents and set their weights. The total is capped at 100%.
            </p>
            <div className="space-y-2">
              {AGENT_PERSONAS.map((persona) => {
                const selected = form.agents.find((a) => a.id === persona.id)
                return (
                  <div
                    key={persona.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      selected ? "border-seafoam/40 bg-seafoam/5" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <button onClick={() => toggleAgent(persona.id)} aria-label={`Toggle ${persona.name}`} className="shrink-0">
                      <Badge variant={selected ? "success" : "outline"}>{selected ? <Check className="h-3 w-3" /> : "+"}</Badge>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${persona.color}`}>{persona.name}</div>
                      <div className="text-xs text-foam/65">{persona.style}</div>
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
                          aria-label={`${persona.name} weight`}
                        />
                        <span className="w-9 text-right text-sm font-semibold text-foam">{selected.weight}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
                weightValid
                  ? "border-seafoam/40 bg-seafoam/10 text-seafoam"
                  : "border-sunset/40 bg-sunset/10 text-sunset"
              }`}
            >
              <span className="flex items-center gap-2">
                {weightValid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Total weight
              </span>
              <span>{totalWeight}% / 100%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${weightValid ? "bg-seafoam" : "bg-sunset"}`}
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foam">Risk parameters</h2>
            <p className="text-sm text-foam/80">Set guardrails for your agent crew.</p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foam">
                Max position size <span className="text-seafoam">{form.maxPositionPct}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={form.maxPositionPct}
                onChange={(e) => setForm({ ...form, maxPositionPct: Number(e.target.value) })}
                className="w-full accent-seafoam"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foam">
                Max drawdown <span className="text-seafoam">{form.maxDrawdownPct}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                value={form.maxDrawdownPct}
                onChange={(e) => setForm({ ...form, maxDrawdownPct: Number(e.target.value) })}
                className="w-full accent-seafoam"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Agent inference provider</label>
              <select
                value={form.inferenceProvider}
                onChange={(e) => setForm({ ...form, inferenceProvider: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 text-sm text-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/60"
              >
                <option value="simulated">Simulated (paper trading)</option>
                <option value="openai">OpenAI-compatible</option>
                <option value="anthropic">Anthropic-compatible</option>
              </select>
              <div className="rounded-xl border border-wave-blue/25 bg-wave-blue/5 p-3 text-xs leading-relaxed text-foam/80">
                <strong className="text-wave-blue">Agent reasoning only.</strong> This chooses the LLM that
                writes agent theses and scores. It does <em>not</em> enable live mainnet trading. Live Keeta
                execution requires <code className="rounded bg-white/10 px-1">LIVE_MODE=true</code>, a funded
                wallet, and an audited vault contract.
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seafoam/15 text-seafoam">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-foam">Review &amp; shape</h2>
            </div>
            <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-ocean-900/30 px-4">
              {[
                ["Name", form.name || "—"],
                ["Agents", `${form.agents.length}`],
                ["Total weight", `${totalWeight}%`],
                ["Max position", `${form.maxPositionPct}%`],
                ["Max drawdown", `${form.maxDrawdownPct}%`],
                ["Status", "Paper"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3 text-sm">
                  <span className="text-foam/90">{label}</span>
                  <span className="font-semibold text-foam">{value}</span>
                </div>
              ))}
            </div>
            <Disclaimer variant="short" />
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading}>
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={nextStep}>Continue</Button>
        ) : (
          <Button onClick={submit} disabled={loading || !weightValid}>
            {loading ? "Shaping…" : "Shape board"}
          </Button>
        )}
      </div>
    </div>
  )
}
