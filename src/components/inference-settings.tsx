"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Cpu, KeyRound, Save, Pencil, X } from "lucide-react"

type Config = { provider: string; model: string; hasCustomEndpoint: boolean; hasApiKey: boolean }

export default function InferenceSettings({
  slug,
  owner,
  config,
}: {
  slug: string
  owner: boolean
  config: Config
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [form, setForm] = React.useState({
    provider: config.provider || "simulated",
    model: config.model || "surfdao-paper",
    endpoint: "",
    apiKey: "",
  })

  React.useEffect(() => {
    setForm({
      provider: config.provider || "simulated",
      model: config.model || "surfdao-paper",
      endpoint: "",
      apiKey: "",
    })
  }, [config])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (form.provider !== "simulated" && !/^https:\/\//i.test(form.endpoint) && !config.hasCustomEndpoint) {
      toast({ title: "Endpoint required", description: "Enter a public https endpoint.", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/funds/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inferenceConfig: form }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Update failed")
      toast({ title: "Harness updated", description: "Agents will use the new API on the next advance." })
      setEditing(false)
      setForm((f) => ({ ...f, endpoint: "", apiKey: "" }))
      router.refresh()
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foam"><Cpu className="h-4 w-4 text-wave-blue" /> Agent inference harness</div>
        {owner && !editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-wave-blue hover:underline">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-foam/70">Provider</span><span className="text-foam">{config.provider}</span></div>
        <div className="flex justify-between"><span className="text-foam/70">Model</span><span className="text-foam">{config.model}</span></div>
        <div className="flex items-center justify-between">
          <span className="text-foam/70">Custom endpoint</span>
          {config.hasCustomEndpoint ? <Badge variant="success">Connected</Badge> : <Badge variant="default">Built-in simulator</Badge>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-foam/70">API key</span>
          {config.hasApiKey ? <Badge variant="success">Stored encrypted</Badge> : <span className="text-foam/70">Not set</span>}
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foam/80">Provider</label>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="flex h-10 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 text-sm text-foam">
              <option value="simulated">Simulated (built-in paper harness)</option>
              <option value="openai">OpenAI-compatible</option>
              <option value="anthropic">Anthropic-compatible</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foam/80">Model</label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" />
          </div>
          {form.provider !== "simulated" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foam/80">Endpoint URL {config.hasCustomEndpoint && "(leave blank to keep current)"}</label>
                <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.example.com/v1" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-medium text-foam/80"><KeyRound className="h-3 w-3" /> API key {config.hasApiKey && "(leave blank to keep current)"}</label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-…" />
              </div>
              <p className="text-[11px] text-foam/70">Endpoints are SSRF-checked; keys are encrypted and never returned to the browser.</p>
            </>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}><X className="mr-1 h-3 w-3" /> Cancel</Button>
            <Button type="submit" disabled={busy}><Save className="mr-1 h-3 w-3" /> {busy ? "Saving…" : "Save harness"}</Button>
          </div>
        </form>
      )}
    </div>
  )
}
