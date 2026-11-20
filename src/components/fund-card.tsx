"use client"

import Link from "next/link"
import { TrendingUp, ShieldCheck, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type FundCardProps = {
  id: string
  name: string
  slug?: string
  description?: string | null
  owner?: string
  status?: string
  mode?: string
  totalReturn?: number
  aum?: number
  allocators?: number
}

export default function FundCard({
  name,
  slug,
  description = "",
  owner,
  status = "paper",
  mode,
  totalReturn = 0,
  aum = 0,
  allocators = 0,
}: FundCardProps) {
  const isUp = totalReturn >= 0
  const href = slug
    ? `/dashboard/funds/${encodeURIComponent(slug)}`
    : `/dashboard/funds/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}`
  return (
    <Link href={href} className="group block">
      <div className="surfboard-card relative overflow-hidden p-5 aspect-video">
        <div className="absolute top-4 left-4">
          <Badge variant={mode === "live" ? "destructive" : status === "live" ? "success" : "default"}>
            {mode === "live" ? "LIVE" : status === "live" ? "LIVE" : "PAPER"}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Wallet className="h-5 w-5 text-seafoam/60" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-foam tracking-tight">{name}</h3>
        <p className="mt-2 text-sm text-foam/80 line-clamp-2">{description}</p>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${isUp ? "text-seafoam" : "text-red-400"}`}>
                {isUp ? "+" : ""}{totalReturn.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-foam/70">all time</span>
            </div>
            <TrendingUp className="h-4 w-4 fill-current" />
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-foam/70">AUM</div>
            <div className="text-sm font-semibold text-foam">${aum.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/5">
          <ShieldCheck className="h-4 w-4 text-foam/60" />
          <span className="text-xs text-foam/70">
            {allocators} allocator{allocators !== 1 ? "s" : ""} • {owner ? owner.slice(0, 8) : "—"}
          </span>
        </div>
      </div>
    </Link>
  )
}
