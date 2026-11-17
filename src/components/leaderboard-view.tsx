"use client"

import * as React from "react"
import LeaderboardTable, { type LeaderboardRow } from "@/components/leaderboard-table"
import ModeToggle from "@/components/mode-toggle"
import { useMode } from "@/components/mode-provider"

export default function LeaderboardView({ rows }: { rows: LeaderboardRow[] }) {
  const { mode, setMode } = useMode()
  const counts = {
    paper: rows.filter((r) => (r.mode ?? "paper") === "paper").length,
    live: rows.filter((r) => (r.mode ?? "paper") === "live").length,
  }
  const filtered = rows
    .filter((r) => (r.mode ?? "paper") === mode)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode={mode} onChange={setMode} counts={counts} />
        <span className="text-xs text-foam/70">
          {mode === "paper" ? "Simulated funds ranked by composite score" : "Live funds ranked by composite score"}
        </span>
      </div>
      <LeaderboardTable rows={filtered} />
    </div>
  )
}
