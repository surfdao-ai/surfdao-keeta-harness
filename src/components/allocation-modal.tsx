"use client"

import * as React from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wallet, AlertCircle, Clock } from "lucide-react"

type AllocationModalProps = {
  open: boolean
  onClose: () => void
  fundId: string
  fundName: string
  onAllocate: (amount: number) => Promise<void>
}

export default function AllocationModal({
  open,
  onClose,
  fundId,
  fundName,
  onAllocate,
}: AllocationModalProps) {
  const [amount, setAmount] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = amount.trim().replace(/,/g, "")
    if (!/^\d+(\.\d{1,6})?$/.test(clean)) {
      toast({
        title: "Enter a valid amount",
        description: "Use a positive number with up to 6 decimals, e.g. 250 or 12.5",
        variant: "destructive",
      })
      return
    }
    const val = Number(clean)
    if (!Number.isFinite(val) || val <= 0 || val > 1_000_000) {
      toast({ title: "Amount out of range", description: "Enter an amount between 0 and 1,000,000 USDC.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      await onAllocate(val)
      toast({ title: "Allocation recorded", description: `Allocated USDC ${val.toFixed(2)} to ${fundName}` })
      onClose()
      setAmount("")
    } catch (e: any) {
      const message = e?.message && typeof e.message === "string" ? e.message : "Please check the amount and try again."
      toast({ title: "Allocation failed", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 p-4">
        <div className="surfboard-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-seafoam" />
            <h2 className="text-xl font-bold text-foam">Drop in</h2>
          </div>
          <p className="text-sm text-foam/80 mb-6">
            Allocate USDC into <strong className="text-foam">{fundName}</strong>. Simulated unless live execution is on.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Amount (USDC)</label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 text-lg font-semibold"
                  disabled={loading}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foam/70">
                  USDC
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-foam/70 mb-1">
              <Clock className="h-3 w-3" />
              Paper-trading recorded on-platform; optional on-chain settlement in live mode.
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !amount}>
                {loading ? "Sending…" : "Drop in"}
              </Button>
            </div>
          </form>
          <div className="mt-5 flex items-center gap-2 text-xs text-amber-400/80">
            <AlertCircle className="h-4 w-4" />
            <span>Experimental — you control your own wallet.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
