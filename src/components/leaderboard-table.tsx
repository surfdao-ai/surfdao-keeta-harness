"use client"

import { Medal, Waves, ShieldCheck, TrendingUp, Users, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type RankStyle = { label: string; color: string; bg: string; border: string }

const RANK_STYLES: RankStyle[] = [
  { label: "Barrel", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" }, // 1st
  { label: "Clean Face", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/30" }, // 2nd
  { label: "Closeout", color: "text-seafoam/80", bg: "bg-seafoam/10", border: "border-seafoam/30" }, // 3rd
  { label: "Inside", color: "text-foam/60", bg: "bg-white/5", border: "border-white/10" }, // rest
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
    <div className="surfboard-card p-0">
      <div className="border-b border-white/5 bg-ocean-800/40 px-6 py-4">
        <h2 className="text-lg font-bold text-foam">Leaderboard</h2>
        <p className="text-xs text-foam/50 mt-1">
          Ranked by composite score: return, consistency, and AUM growth.{" "}
          <span className="text-seafoam">Paper trading results.</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Rank</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Fund</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Return</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Consistency</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">AUM</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Allocators</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-foam/50 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = RANK_STYLES[Math.min(row.rank - 1, 3)]
              const isUp = row.totalReturn >= 0
              return (
                <tr
                  key={row.slug}
                  className="border-b border-white/5 hover:bg-white/3 transition group"
                >
                  <td className="px-6 py-4">
                    {row.rank <= 3 ? (
                      <Medal className="h-5 w-5 shrink-0" style={{ color: style.color }} />
                    ) : (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full {style.bg} {style.border} text-xs font-bold {style.color}">
                        {row.rank}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foam">{row.name}</div>
                    <div className="text-xs text-foam/50">{row.ownerId.slice(0, 6)}…{row.ownerId.slice(-4)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-bold ${isUp ? "text-seafoam" : "text-red-400"}`}>
                      {isUp ? "+" : ""}{row.totalReturn.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-foam/70">{row.consistency.toFixed(0)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-foam/70">${row.aum.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-foam/70">{row.allocators}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
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
      <div className="border-t border-white/5 bg-ocean-800/30 px-6 py-3">
        <span className="text-[10px] text-foam/40 uppercase tracking-wider">
          Surf-themed ranks: Barrel (1st) • Clean Face (2nd) • Closeout (3rd)
        </span>
      </div>
    </div>
  )
}
