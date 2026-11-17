"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ShieldAlert, Zap, X } from "lucide-react"

type Check = { key: string; label: string; ok: boolean; detail: string; userAction: boolean }
type Status = { enabled: boolean; checks: Check[]; canEnable: boolean }

export default function LiveModeControl({
  slug,
  owner,
  mode,
  wallet,
  vault,
}: {
  slug: string
  owner: boolean
  mode: "paper" | "live"
  wallet: string | null
  vault?: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [status, setStatus] = React.useState<Status | null>(null)
  const [walletInput, setWalletInput] = React.useState(wallet ?? "")
  const [vaultInput, setVaultInput] = React.useState(vault ?? "")
  const [ack, setAck] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    fetch(`/api/live-status?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {})
  }, [open, slug])

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/funds/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Update failed")
      toast({ title: "Updated", description: message })
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast({ title: "Could not update", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setBusy(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          mode === "live"
            ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "border-white/15 bg-white/[0.02] text-foam/80 hover:border-white/30"
        }`}
      >
        <Zap className="h-3.5 w-3.5" /> {mode === "live" ? "Live execution" : "Paper execution"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="surfboard-card relative z-10 w-full max-w-lg p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400"><ShieldAlert className="h-5 w-5" /></div>
                <h2 className="text-lg font-bold text-foam">Live execution</h2>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-foam/70" /></button>
            </div>

            <p className="mb-4 text-sm text-foam/80">
              Live mode sends real Keeta transactions. Every prerequisite below must be satisfied.
              We cannot provide an audited vault — you must supply your own.
            </p>

            <div className="space-y-2">
              {(status?.checks ?? []).map((c) => (
                <div key={c.key} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-seafoam" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />}
                  <div>
                    <div className="text-sm font-medium text-foam">{c.label}</div>
                    <div className="text-xs text-foam/70">{c.detail}</div>
                  </div>
                </div>
              ))}
              {!status && <p className="text-sm text-foam/70">Checking readiness…</p>}
            </div>

            {owner && (
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foam/80">Fund Keeta wallet</label>
                  <Input value={walletInput} onChange={(e) => setWalletInput(e.target.value)} placeholder="keeta_…" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foam/80">Audited vault address (yours)</label>
                  <Input value={vaultInput} onChange={(e) => setVaultInput(e.target.value)} placeholder="keeta_…" />
                </div>
                <Button variant="outline" className="w-full" disabled={busy}
                  onClick={() => patch({ keetaWalletAddress: walletInput || null, vaultAddress: vaultInput || null }, "Wallet and vault saved")}>
                  Save addresses
                </Button>
                <label className="flex items-start gap-2 rounded-xl border border-sunset/30 bg-sunset/5 p-3 text-xs text-foam/90">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                  I understand live mode moves real value, that this MVP has no professionally audited vault,
                  and that I am solely responsible for any losses.
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" disabled={busy || mode !== "live"}
                    onClick={() => patch({ executionMode: "paper" }, "Switched back to paper execution")}>
                    Use paper
                  </Button>
                  <Button className="flex-1" disabled={busy || !ack || !status?.canEnable || mode === "live"}
                    onClick={() => patch({ executionMode: "live", acknowledgeRisk: true }, "Live execution enabled")}>
                    Enable live
                  </Button>
                </div>
                {status && !status.canEnable && (
                  <p className="text-xs text-sunset">Prerequisites must all pass before live execution can be enabled.</p>
                )}
              </div>
            )}
            {!owner && <p className="mt-4 text-sm text-foam/70">Only the fund owner can change execution mode.</p>}
          </div>
        </div>
      )}
    </>
  )
}
