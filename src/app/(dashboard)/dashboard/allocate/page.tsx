"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import AllocationModal from "@/components/allocation-modal"
import Disclaimer from "@/components/disclaimer"
import ModeToggle from "@/components/mode-toggle"
import { useMode } from "@/components/mode-provider"
import { DollarSign, Users, TrendingUp, Search } from "lucide-react"

type Fund = {
  id: string
  slug: string
  name: string
  description: string
  ownerId: string
  status: string
  mode?: string
  aum: number
  allocators: number
  totalReturn: number
}

export default function AllocatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [funds, setFunds] = React.useState<Fund[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const { mode, setMode } = useMode()
  const [target, setTarget] = React.useState<Fund | null>(null)

  React.useEffect(() => {
    loadFunds()
  }, [])

  async function loadFunds() {
    try {
      const res = await fetch("/api/leaderboard")
      const json = await res.json()
      setFunds(json.funds ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function allocate(amount: number) {
    if (!target) return
    const res = await fetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fundId: target.slug, amountUsdc: amount }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Allocation failed")
    toast({ title: "Checks passed", description: json.checks?.summary ?? "Wave conditions: clear" })
    loadFunds()
    return json
  }

  const counts = {
    paper: funds.filter((f) => (f.mode ?? "paper") === "paper").length,
    live: funds.filter((f) => (f.mode ?? "paper") === "live").length,
  }
  const filtered = funds
    .filter((f) => (f.mode ?? "paper") === mode)
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foam">Allocate capital</h1>
        <p className="text-foam/80 mt-1">Drop in on funds you believe in. KeeSpecs checks run before every allocation.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode={mode} onChange={setMode} counts={counts} />
        <span className="text-xs text-foam/70">
          {mode === "paper" ? "Simulated allocations — no real USDC moves" : "Live funds — verify the vault before allocating real USDC"}
        </span>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-foam/60" />
        <Input placeholder="Search funds…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-foam/70">Loading funds…</p>
      ) : filtered.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <div key={f.slug} className="surfboard-card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={f.mode === "live" ? "destructive" : "default"}>{(f.mode ?? "paper").toUpperCase()}</Badge>
                <span className={`text-sm font-bold ${f.totalReturn >= 0 ? "text-seafoam" : "text-red-400"}`}>
                  {f.totalReturn >= 0 ? "+" : ""}{f.totalReturn.toFixed(1)}%
                </span>
              </div>
              <Link href={`/dashboard/funds/${f.slug}`} className="text-lg font-bold text-foam hover:text-wave-blue transition">
                {f.name}
              </Link>
              <p className="text-sm text-foam/70 mt-1 line-clamp-2 flex-1">{f.description || "No description."}</p>
              <div className="flex items-center gap-4 mt-4 text-xs text-foam/70">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${f.aum.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{f.allocators}</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />#{f.allocators || "—"}</span>
              </div>
              <Button className="mt-4 w-full" onClick={() => setTarget(f)}>Drop in</Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surfboard-card p-12 text-center">
          <p className="text-foam/70">
            {mode === "live" ? "No live funds yet. Switch Paper to see simulated boards." : "No funds found. Be the first to shape a board."}
          </p>
        </div>
      )}

      <Disclaimer />

      {target && (
        <AllocationModal
          open={!!target}
          onClose={() => setTarget(null)}
          fundId={target.slug}
          fundName={target.name}
          onAllocate={allocate}
        />
      )}
    </div>
  )
}
