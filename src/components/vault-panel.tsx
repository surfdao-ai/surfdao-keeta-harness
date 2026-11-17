"use client"

import * as React from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Wallet, ArrowDownToLine, RefreshCw, ShieldCheck } from "lucide-react"

type VaultInfo = {
  address: string | null
  explorerUrl: string | null
  balances: { token: string; amount: number }[]
  deposits: { hash: string; date: string; sender: string; amount: number }[]
  keeperConfigured: boolean
  liveEnabled: boolean
}

export default function VaultPanel({
  slug,
  owner,
  canWithdraw,
  withdrawable,
}: {
  slug: string
  owner: boolean
  canWithdraw: boolean
  withdrawable: number
}) {
  const { toast } = useToast()
  const [info, setInfo] = React.useState<VaultInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [amount, setAmount] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/funds/${encodeURIComponent(slug)}/vault`)
      if (res.ok) setInfo(await res.json())
    } catch {} finally { setLoading(false) }
  }, [slug])

  React.useEffect(() => { load() }, [load])

  async function provision() {
    setBusy(true)
    try {
      const res = await fetch(`/api/funds/${encodeURIComponent(slug)}/vault`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Could not provision vault")
      toast({ title: "Vault created", description: "Share the address below with allocators." })
      load()
    } catch (e: any) {
      toast({ title: "Provision failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setBusy(false) }
  }

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!n || n <= 0 || n > withdrawable) {
      toast({ title: "Invalid amount", description: `Up to ${withdrawable.toFixed(2)} USDC available`, variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundId: slug, amountUsdc: n, keetaAddress: address || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Request failed")
      toast({ title: "Withdrawal requested", description: "The keeper reviews it after the 24h timelock." })
      setAmount("")
    } catch (e: any) {
      toast({ title: "Request failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setBusy(false) }
  }

  if (loading) return <p className="text-sm text-foam/70">Loading vault…</p>

  return (
    <div className="space-y-4">
      {!info?.address ? (
        <div className="rounded-xl border border-dashed border-white/15 p-5 text-center">
          <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-foam/50" />
          <p className="text-sm text-foam/80">No on-chain vault yet. Allocations are simulated.</p>
          {owner && (
            <Button className="mt-3" onClick={provision} disabled={busy || !info?.liveEnabled || !info?.keeperConfigured}>
              {busy ? "Creating…" : "Provision Keeta vault"}
            </Button>
          )}
          {owner && (!info?.liveEnabled || !info?.keeperConfigured) && (
            <p className="mt-2 text-xs text-sunset">Requires LIVE_MODE and a configured keeper signer on the server.</p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-seafoam/30 bg-seafoam/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-seafoam"><Wallet className="h-4 w-4" /> Fund vault (Keeta storage account)</span>
              <Badge variant={info.liveEnabled ? "success" : "default"}>{info.liveEnabled ? "ON-CHAIN" : "PAPER"}</Badge>
            </div>
            <code className="block break-all rounded-lg bg-black/30 p-2 text-xs text-foam/90">{info.address}</code>
            {info.explorerUrl && (
              <a href={info.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-wave-blue hover:underline">
                Verify on KeetaScan <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <p className="mt-2 text-xs text-foam/70">
              Send USDC on Keeta to this address. The keeper verifies the deposit on-chain and credits your allocation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-xs uppercase tracking-wider text-foam/70">Vault balance</div>
              <div className="mt-1 text-lg font-bold text-foam">
                ${info.balances.reduce((s, b) => s + b.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-xs uppercase tracking-wider text-foam/70">Verified deposits</div>
              <div className="mt-1 text-lg font-bold text-foam">{info.deposits.length}</div>
            </div>
          </div>

          {canWithdraw && withdrawable > 0 && (
            <form onSubmit={requestWithdrawal} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foam"><ArrowDownToLine className="h-4 w-4 text-seafoam" /> Request withdrawal</div>
              <p className="text-xs text-foam/70">Up to {withdrawable.toFixed(2)} USDC · 24h timelock · paid by the keeper from the vault.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="text" inputMode="decimal" placeholder="Amount USDC" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Input placeholder="keeta_… (your wallet)" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Request withdrawal"}</Button>
            </form>
          )}

          {info.deposits.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-foam/70">Recent on-chain deposits</div>
              {info.deposits.slice(0, 5).map((d) => (
                <div key={d.hash} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-2 text-xs">
                  <span className="text-foam/80">{new Date(d.date).toLocaleString()} · {d.sender.slice(0, 10)}…</span>
                  <span className="font-semibold text-seafoam">${d.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <button onClick={load} className="inline-flex items-center gap-1 text-xs text-foam/70 hover:text-foam"><RefreshCw className="h-3 w-3" /> Refresh</button>
    </div>
  )
}
