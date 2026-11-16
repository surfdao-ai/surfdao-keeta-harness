"use client"

export default function Disclaimer({ variant = "full" }: { variant?: "full" | "short" }) {
  return (
    <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 text-sm text-yellow-200/90">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-yellow-400">⚠</span>
        <span className="font-semibold text-yellow-300">Experimental — not financial advice.</span>
      </div>
      {variant === "full" ? (
        <p className="leading-relaxed">
          SurfDAO.ai is an experimental paper-trading harness. Funds, agents, and allocations are
          simulated unless you explicitly enable live execution (LIVE_MODE=true) and connect your own
          Keeta wallet. You control your own wallet and are responsible for your allocations. No outside
          capital should be accepted without proper licensing. Performance shown is simulated and does not
          guarantee future results. Use at your own risk.
        </p>
      ) : (
        <p className="leading-relaxed">
          Experimental paper-trading harness. Simulated unless live execution is enabled. You control your
          own wallet and are responsible for your allocations. Not financial advice.
        </p>
      )}
    </div>
  )
}
