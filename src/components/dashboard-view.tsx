"use client"

import * as React from "react"
import Link from "next/link"
import { Waves, TrendingUp, DollarSign, Flag, ArrowRight, BookOpen, FileText, Zap } from "lucide-react"
import type { Fund, FundSession, Allocation, User } from "@/lib/db/schema"
import { fundStats, publicFund } from "@/lib/fund-helpers"
import FundCard from "@/components/fund-card"
import Disclaimer from "@/components/disclaimer"
import { cn } from "@/lib/utils"

type Mode = "paper" | "live"

export default function DashboardView({
  user,
  funds,
  sessions,
  allocations,
  liveEnabled,
}: {
  user: User | null
  funds: Fund[]
  sessions: FundSession[]
  allocations: Allocation[]
  liveEnabled: boolean
}) {
  const [mode, setMode] = React.useState<Mode>("paper")

  const counts = {
    paper: funds.filter((f) => (f.executionMode ?? "paper") === "paper").length,
    live: funds.filter((f) => (f.executionMode ?? "paper") === "live").length,
  }

  const scopedFunds = funds.filter((f) => (f.executionMode ?? "paper") === mode)
  const scopedIds = new Set(scopedFunds.map((f) => f.id))
  const scopedSessions = sessions
    .filter((s) => scopedIds.has(s.fundId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const stats = scopedFunds.map((f) => ({ fund: f, ...fundStats(f, sessions, allocations) }))
  const totalAum = stats.reduce((s, x) => s + x.aum, 0)
  const mostRecent = stats.reduce<FundSession | null>((best, x) => {
    if (!x.latestSession) return best
    if (!best || x.latestSession.timestamp > best.timestamp) return x.latestSession
    return best
  }, null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foam">Your dashboard</h1>
        <p className="mt-1 text-foam/80">
          Welcome back{user ? `, ${user.name ?? user.email}` : ""}. Your boards and sessions live here.
        </p>
      </div>

      {/* Paper / Live mode selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ocean-800/40 p-2">
        <div className="flex gap-1">
          {(["paper", "live"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
                mode === m
                  ? m === "live"
                    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/40"
                    : "bg-seafoam/15 text-seafoam ring-1 ring-seafoam/40"
                  : "text-foam/70 hover:bg-white/5",
              )}
            >
              {m === "live" ? <Zap className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {m === "paper" ? "Paper" : "Live"}
              <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs">{counts[m]}</span>
            </button>
          ))}
        </div>
        <span className="pr-2 text-xs text-foam/70">
          {mode === "paper"
            ? "Simulated boards — no real value moves."
            : realLabel(liveEnabled)}
        </span>
      </div>

      <div className="surfboard-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", mode === "live" ? "bg-red-500/15 text-red-400" : "bg-seafoam/15 text-seafoam")}>
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foam">Execution mode</h2>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", mode === "live" ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-seafoam/40 bg-seafoam/10 text-seafoam")}>
                  {mode === "live" ? "LIVE" : "PAPER"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-foam/80">
                {mode === "paper"
                  ? "Showing simulated funds, NAV, theses, and allocations."
                  : liveEnabled
                    ? "Showing live funds. Verify vaults before allocating real USDC."
                    : "Server LIVE_MODE is off — these funds cannot execute real transactions."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/live-mode" className="flex items-center gap-1.5 text-xs font-medium text-wave-blue hover:underline">
            <BookOpen className="h-3.5 w-3.5" /> How to enable live mode <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Funds" value={scopedFunds.length} icon={<Flag className="h-5 w-5" />} color="text-wave-blue" />
        <StatCard title="AUM attracted" value={`$${totalAum.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} color="text-seafoam" />
        <StatCard title="Latest NAV" value={`$${mostRecent ? Number(mostRecent.nav).toLocaleString() : "10,000"}`} icon={<TrendingUp className="h-5 w-5" />} color="text-sunset" />
        <StatCard title="Sessions" value={scopedSessions.length} icon={<Waves className="h-5 w-5" />} color="text-slate-300" />
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">{mode === "paper" ? "Paper funds" : "Live funds"}</h2>
        {stats.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ fund, totalReturn, aum, allocators }) => (
              <FundCard key={fund.id} {...publicFund(fund)} mode={mode} totalReturn={totalReturn} aum={aum} allocators={allocators} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="mb-4 text-foam/70">
              {mode === "paper"
                ? "No paper funds yet. Shape your first board."
                : "No live funds yet. Enable live execution on a fund to see it here."}
            </p>
            <Link href="/dashboard/funds/new" className="font-medium text-wave-blue underline underline-offset-4">Create a fund →</Link>
          </div>
        )}
      </div>

      <div className="surfboard-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foam"><Waves className="h-5 w-5 text-seafoam" /> Recent sessions</h2>
          <Link href="/dashboard/profile" className="text-xs text-wave-blue hover:underline">All activity →</Link>
        </div>
        {scopedSessions.length ? (
          <div className="divide-y divide-white/5">
            {scopedSessions.slice(0, 6).map((s) => {
              const fund = scopedFunds.find((f) => f.id === s.fundId)
              const checks = s.checks as { condition?: string } | null
              const ret = Number(s.returnPct ?? 0)
              return (
                <Link key={s.id} href={`/dashboard/funds/${fund?.slug}`} className="flex items-center justify-between gap-3 py-3 transition hover:bg-white/5">
                  <div className="min-w-0 pr-3">
                    <div className="truncate text-sm font-medium text-foam">{fund?.name ?? "Unknown fund"}</div>
                    <div className="truncate text-xs text-foam/70">{new Date(s.timestamp).toLocaleString()} · wave {checks?.condition ?? "clear"}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-foam">${Number(s.nav).toLocaleString()}</div>
                    <div className={cn("text-xs", ret >= 0 ? "text-seafoam" : "text-red-400")}>{ret >= 0 ? "+" : ""}{ret.toFixed(2)}%</div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-foam/70">No sessions in this mode yet. Run an advance on one of your boards.</p>
        )}
      </div>

      <Disclaimer variant="short" />
    </div>
  )
}

function realLabel(liveEnabled: boolean) {
  return liveEnabled
    ? "Server live mode is enabled — real value can move."
    : "Server LIVE_MODE is off — live funds are display-only."
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="surfboard-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">{icon}</div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-foam/70">{title}</h3>
      </div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
    </div>
  )
}
