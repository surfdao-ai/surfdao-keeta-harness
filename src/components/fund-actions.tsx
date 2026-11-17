"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import AllocationModal from "@/components/allocation-modal"
import { Play, Wallet, RefreshCw } from "lucide-react"

type Vote = { agentName: string; score: number; thesis: string }

export default function FundActions({
  slug,
  fundName,
  owner,
}: {
  slug: string
  fundName: string
  owner: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [running, setRunning] = React.useState(false)
  const [allocOpen, setAllocOpen] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)

  async function runAdvance() {
    setRunning(true)
    try {
      const res = await fetch(`/api/funds/${encodeURIComponent(slug)}/advance`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Advance failed")
      setResult(json)
      toast({
        title: "Session complete",
        description: json.summary,
      })
      router.refresh()
    } catch (e: any) {
      toast({ title: "Advance failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  async function allocate(amount: number) {
    const res = await fetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fundId: slug, amountUsdc: amount }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Allocation failed")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {owner ? (
          <Button onClick={runAdvance} disabled={running}>
            {running ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {running ? "Running…" : "Run advance"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => setAllocOpen(true)}>
          <Wallet className="h-4 w-4 mr-2" /> Allocate
        </Button>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-seafoam/30 bg-seafoam/5 p-4 text-sm text-foam">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-seafoam">Wave conditions: {result.waveCondition}</span>
            <span className="text-foam/80">NAV ${Number(result.nav).toLocaleString()} ({Number(result.returnPct) >= 0 ? "+" : ""}{Number(result.returnPct).toFixed(2)}%)</span>
          </div>
          <p className="text-foam/90">{result.summary}</p>
        </div>
      )}

      <AllocationModal
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        fundId={slug}
        fundName={fundName}
        onAllocate={allocate}
      />
    </>
  )
}
