"use client"

import { FileText, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export type Mode = "paper" | "live"

export default function ModeToggle({
  mode,
  onChange,
  counts,
  className,
}: {
  mode: Mode
  onChange: (m: Mode) => void
  counts?: Partial<Record<Mode, number>>
  className?: string
}) {
  return (
    <div className={cn("inline-flex gap-1 rounded-xl border border-white/10 bg-ocean-800/40 p-1", className)}>
      {(["paper", "live"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
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
          {counts?.[m] != null && <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs">{counts[m]}</span>}
        </button>
      ))}
    </div>
  )
}
