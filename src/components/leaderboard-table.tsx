"use client"

import { Medal, Trophy, Users, DollarSign, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RankStyle = { label: string; color: string; bg: string; border: string }

const RANK_STYLES: RankStyle[] = [
  { label: "Barrel", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  { label: "Clean Face", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/30" },
  { label: "Closeout", color: "text-seafoam", bg: "bg-seafoam/10", border: "border-seafoam/30" },
  { label: "Inside", color: "text-foam/80", bg: "bg-white/5", border: "border-white/10" },
]

export type LeaderboardRow = {
  rank: number
  slug: string
  name: string
  ownerId: string
  status: string
  totalReturn: number
  nav: number
  aum: number
  allocators: number
  consistency: number
  composite: number
}

export default function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="surfboard-card min-w-0 overflow-hidden">
      <div className="border-b border-white/5 bg-ocean-800/40 px-4 py-4 lg:px-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foam">
          <Trophy className="h-5 w-5 text-yellow-400" /> Leaderboard
        </h2>
        <p className="mt-1 text-xs text-foam/80">
          Composite score: return, consistency, and AUM growth.{" "}
          <span className="text-seafoam">Paper trading results.</span>
        </p>
      </div>

      {/* Mobile: stacked cards (no horizontal overflow) */}
      <div className="divide-y divide-white/5 md:hidden">
        {rows.map((row) => {
          const style = RANK_STYLES[Math.min(row.rank - 1, 3)]
          const isUp = row.totalReturn >= 0
          return (
            <a key={row.slug} href={`/dashboard/funds/${row.slug}`} className="block p-4 transition hover:bg-white/5">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold", style.bg, style.border, style.color)}>
                  {row.rank <= 3 ? <Medal className="h-4 w-4" /> : row.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foam">{row.name}</div>
                  <div className="truncate text-xs text-foam/70">
                    {style.label} • {row.ownerId.slice(0, 6)}…{row.ownerId.slice(-4)}
                  </div>
                </div>
                <div className={cn("shrink-0 text-right font-bold", isUp ? "text-seafoam" : "text-red-400")}>
                  {isUp ? "+" : ""}{row.totalReturn.toFixed(1)}%
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-foam/80">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${row.aum.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{row.allocators}</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{row.consistency.toFixed(0)}</span>
                <Badge variant={row.status === "live" ? "success" : "default"} className="ml-auto">
                  {row.status === "live" ? "Live" : "Paper"}
                </Badge>
              </div>
            </a>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foam/70">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foam/70">Fund</th>
              <th className="w-24 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-foam/70">Return</th>
              <th className="w-28 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-foam/70">Consistency</th>
              <th className="w-24 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-foam/70">AUM</th>
              <th className="w-24 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-foam/70">Allocators</th>
              <th className="w-20 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-foam/70">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = RANK_STYLES[Math.min(row.rank - 1, 3)]
              const isUp = row.totalReturn >= 0
              return (
                <tr key={row.slug} className="border-b border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-4">
                    {row.rank <= 3 ? (
                      <Medal className="h-5 w-5" style={{ color: style.color }} />
                    ) : (
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold", style.bg, style.border, style.color)}>
                        {row.rank}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <a href={`/dashboard/funds/${row.slug}`} className="font-medium text-foam hover:text-wave-blue">
                      <div className="truncate">{row.name}</div>
                      <div className="truncate text-xs text-foam/70">{row.ownerId.slice(0, 6)}…{row.ownerId.slice(-4)}</div>
                    </a>
                  </td>
                  <td className={cn("px-3 py-4 text-right font-bold", isUp ? "text-seafoam" : "text-red-400")}>
                    {isUp ? "+" : ""}{row.totalReturn.toFixed(1)}%
                  </td>
                  <td className="px-3 py-4 text-right text-foam/80">{row.consistency.toFixed(0)}</td>
                  <td className="px-3 py-4 text-right text-foam/80">${row.aum.toLocaleString()}</td>
                  <td className="px-3 py-4 text-right text-foam/80">{row.allocators}</td>
                  <td className="px-3 py-4 text-right">
                    <Badge variant={row.status === "live" ? "success" : "default"}>
                      {row.status === "live" ? "Live" : "Paper"}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/5 bg-ocean-800/30 px-4 py-3">
        <span className="text-[10px] uppercase tracking-wider text-foam/70">
          Surf ranks: Barrel (1st) • Clean Face (2nd) • Closeout (3rd)
        </span>
      </div>
    </div>
  )
}
