import Link from "next/link"
import { ArrowLeft, BookOpen, ShieldAlert, CheckCircle2, XCircle, Server, Wallet, Landmark, Database, Rocket } from "lucide-react"
import Disclaimer from "@/components/disclaimer"
import { liveReadiness } from "@/lib/live-mode"

export const dynamic = "force-dynamic"

export default function LiveModePage() {
  const live = process.env.LIVE_MODE === "true"
  const readiness = liveReadiness(null)
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-foam/80 hover:text-foam">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-wave-blue/30 bg-wave-blue/10 px-3 py-1 text-xs font-medium text-wave-blue">
          <BookOpen className="h-3 w-3" /> Execution modes
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foam">Paper trading vs Live mode</h1>
        <p className="mt-1 text-foam/80">How the harness decides whether real Keeta value moves.</p>
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">Current status</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${live ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-seafoam/40 bg-seafoam/10 text-seafoam"}`}>
            {live ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {live ? "LIVE MODE ENABLED" : "PAPER MODE (simulated)"}
          </span>
          <p className="text-sm text-foam/80">
            Controlled by the server environment variable <code className="rounded bg-white/10 px-1.5 py-0.5">LIVE_MODE</code>.
            This cannot be toggled from the UI — by design.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-seafoam/30 bg-seafoam/5 p-4">
            <div className="font-semibold text-seafoam">Paper mode (current)</div>
            <p className="mt-1 text-sm text-foam/80">Agent scores, theses, NAV moves, KeeSpecs checks, and allocation tx hashes are all simulated. Nothing reaches the network.</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="font-semibold text-red-400">Live mode</div>
            <p className="mt-1 text-sm text-foam/80">The Keeta client signs and sends real transactions, KeeSpecs x402 calls are paid, and allocations are marked active on-chain.</p>
          </div>
        </div>
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">Server readiness</h2>
        <div className="space-y-2">
          {readiness.checks.filter((c) => !c.userAction).map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-seafoam" /> : <XCircle className="h-4 w-4 text-sunset" />}
              <span className="font-medium text-foam">{c.label}</span>
              <span className="ml-auto text-xs text-foam/70">{c.detail}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-foam/70">
          Fund-specific wallet and vault checks appear in each fund&apos;s Live execution panel.
        </p>
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foam"><Server className="h-5 w-5 text-wave-blue" /> How to enable live mode</h2>
        <ol className="space-y-4">
          {[
            { icon: Server, title: "1. Set the server flag", body: "Vercel: vercel env add LIVE_MODE production → true. Self-hosted: add LIVE_MODE=true to .env.local. Then redeploy." },
            { icon: Wallet, title: "2. Provision a funded Keeta wallet", body: "Set each fund's keetaWalletAddress to an address you control. The MVP's server-side signer must be replaced with user-authorized signing (WalletConnect/Anchor) before real value is at risk." },
            { icon: Landmark, title: "3. Deploy an audited vault", body: "Fund deposits should go to vault accounts with owner-controlled ACLs, not arbitrary wallets. Configure X402_GATEWAY + X402_TOKEN for paid KeeSpecs checks." },
            { icon: Database, title: "4. Replace the simulated engine", body: "Swap the score-derived NAV in /api/funds/[slug]/advance for real execution results and persist with Drizzle + Neon (DATABASE_URL) instead of the JSON/cookie store." },
            { icon: Rocket, title: "5. Redeploy and verify", body: "Run vercel --prod, confirm this page reads LIVE, then test with a tiny amount before any meaningful allocation." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-seafoam" />
              <div><div className="text-sm font-semibold text-foam">{title}</div><p className="mt-1 text-sm text-foam/80">{body}</p></div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl border border-sunset/30 bg-sunset/5 p-3 text-sm text-sunset">
          ⚠️ Setting LIVE_MODE=true alone only switches the Keeta client from simulated hashes to real sendToken() calls. The current MVP is not safe for real capital until steps 2–5 are complete.
        </p>
      </div>

      <Disclaimer />
    </div>
  )
}
