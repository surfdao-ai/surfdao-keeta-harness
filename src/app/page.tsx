import Link from "next/link"
import { ArrowRight, Compass, Flag, ShieldCheck, Waves, TrendingUp, Users, Lock, Landmark, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { store } from "@/lib/db/schema"
import { fundStats } from "@/lib/fund-helpers"

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  // Live marketplace figures for the hero strip (public data only).
  const [funds, sessions, allocations] = await Promise.all([
    store.funds.list(),
    store.fundSessions.list(),
    store.allocations.list(),
  ])
  const publicFunds = funds.filter((f) => f.isPublic)
  const liveAum = allocations
    .filter((a) => a.status === "active" || a.status === "pending")
    .reduce((s, a) => s + Number(a.amountUsdc), 0)
  const best = publicFunds
    .map((f) => ({ f, stats: fundStats(f, sessions, allocations) }))
    .sort((a, b) => b.stats.totalReturn - a.stats.totalReturn)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-ocean-900 text-foam relative wave-bg overflow-hidden">
      <div className="wave-stripe" />
      <div className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wave-blue to-seafoam ring-2 ring-seafoam/30" />
            <span className="font-bold text-2xl tracking-tighter">Surf<span className="text-sunset">DAO</span></span>
          </div>
          <div className="hidden md:flex gap-7 text-sm font-medium text-foam/80">
            <Link href="/dashboard" className="hover:text-wave-blue transition">Dashboard</Link>
            <Link href="/dashboard/leaderboard" className="hover:text-wave-blue transition">Leaderboard</Link>
            <Link href="#how" className="hover:text-wave-blue transition">How it works</Link>
            <Link href="#safety" className="hover:text-wave-blue transition">Safety</Link>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/funds/new">Shape your board</Link>
            </Button>
          </div>
        </nav>

        <main>
          <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
            <span className="fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-seafoam/30 bg-seafoam/10 text-xs font-semibold text-seafoam mb-8">
              <span className="live-dot" /> Paper trading live on the Keeta harness
            </span>
            <h1 className="fade-up text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
              Surf the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wave-blue via-seafoam to-sunset">
                AI agent markets
              </span>
            </h1>
            <p className="text-lg md:text-xl text-foam/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Launch your own AI-agent hedge fund (&quot;board&quot;), run paper-trading sessions with KeeSpecs
              safety checks, and allocate USDC into other funds on Keeta mainnet. A living marketplace of
              strategies — built on the surf.
            </p>
            <div className="fade-up flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button asChild className="px-8 py-3 text-lg">
                <Link href="/dashboard/funds/new">Create a fund <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" asChild className="px-8 py-3 text-lg">
                <Link href="/dashboard/leaderboard">View leaderboard</Link>
              </Button>
            </div>

            {/* Live marketplace strip */}
            <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <HeroStat label="Public boards" value={String(publicFunds.length)} />
              <HeroStat label="AUM tracked" value={`$${liveAum.toLocaleString()}`} />
              <HeroStat label="Trading sessions" value={String(sessions.length)} />
              <HeroStat label="Best return" value={best[0] ? `${best[0].stats.totalReturn >= 0 ? "+" : ""}${best[0].stats.totalReturn.toFixed(1)}%` : "—"} />
            </div>

            {/* Leaderboard preview */}
            {best.length > 0 && (
              <div className="mt-14 max-w-3xl mx-auto text-left">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foam/70">Top boards this week</h2>
                  <Link href="/dashboard/leaderboard" className="text-xs font-medium text-wave-blue hover:underline">Full leaderboard →</Link>
                </div>
                <div className="surfboard-card divide-y divide-white/5">
                  {best.map(({ f, stats }, i) => (
                    <Link key={f.id} href={`/dashboard/funds/${encodeURIComponent(f.slug)}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-sand/20 text-sand" : i === 1 ? "bg-foam/15 text-foam/80" : "bg-board-wood/30 text-foam/70"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-foam">{f.name}</div>
                        <div className="text-xs text-foam/60">{stats.sessionCount} sessions · {stats.allocators} allocators</div>
                      </div>
                      <div className={`text-sm font-bold ${stats.totalReturn >= 0 ? "text-seafoam" : "text-red-400"}`}>
                        {stats.totalReturn >= 0 ? "+" : ""}{stats.totalReturn.toFixed(1)}%
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section id="how" className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-3xl font-bold text-foam mb-4 text-center">How it works</h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-foam/70">
              Three moves to go from idea to ranked fund.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Flag,
                  title: "Shape your board",
                  body: "Name your fund, pick strategy agents (Deep Value, Disruptive Growth, Contrarian Value, Quality Moat…), set risk parameters, and link your Keeta wallet.",
                },
                {
                  icon: Activity,
                  title: "Run with KeeSpecs",
                  body: "Each advance runs the agent pipeline, then KeeSpecs x402 safety checks before any action. Wave conditions: clear / caution / hold.",
                },
                {
                  icon: Users,
                  title: "Attract capital",
                  body: "Successful funds hit the public leaderboard. Anyone can allocate USDC into your fund — performance and AUM drive your rank.",
                },
              ].map((step, i) => (
                <div key={step.title} className="surfboard-card p-6" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-wave-blue/10 flex items-center justify-center text-wave-blue">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-4xl font-black text-white/5 select-none">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foam mb-2">{step.title}</h3>
                  <p className="text-sm text-foam/80 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="safety" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foam mb-4">Built so funds can&apos;t rug</h2>
                <p className="text-foam/80 leading-relaxed mb-8">
                  Custody is designed around a hard rule: the platform keeper owns the vault, never the fund
                  creator. Creators earn a performance fee on gains — nothing more.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: Lock, title: "Keeper-held vaults", body: "The keeper — not the creator — holds the storage vault. Creators never receive OWNER or SEND_ON_BEHALF, so they cannot withdraw allocator funds." },
                    { icon: ShieldCheck, title: "KeeSpecs before every move", body: "Free health check, then paid x402 safety checks before any material action. Large moves get a caution flag for liquidity." },
                    { icon: Landmark, title: "Timelocked exits", body: "Withdrawals sit in a 24-hour timelock; performance fees pay out to the creator only after a 7-day lock." },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-seafoam/10 text-seafoam">
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foam">{item.title}</div>
                        <div className="text-sm text-foam/70 leading-relaxed">{item.body}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surfboard-card p-8">
                <h3 className="text-lg font-bold text-foam mb-6">Fee model at a glance</h3>
                <div className="space-y-4">
                  {[
                    { label: "Vault principal", owner: "Platform keeper", note: "creator gets no ownership" },
                    { label: "Gains performance fee", owner: "Fund creator", note: "default 10%, max 30%" },
                    { label: "Fee timelock", owner: "7 days", note: "then paid to the creator wallet" },
                    { label: "Withdrawals", owner: "24h timelock", note: "paid by the keeper" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-foam">{row.label}</div>
                        <div className="text-xs text-foam/60">{row.note}</div>
                      </div>
                      <span className="shrink-0 rounded-full border border-seafoam/30 bg-seafoam/10 px-3 py-1 text-xs font-semibold text-seafoam">{row.owner}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/live-mode" className="mt-6 flex items-center gap-1.5 text-sm font-medium text-wave-blue hover:underline">
                  <Compass className="h-4 w-4" /> How to enable live mode <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="surfboard-card p-8 md:p-14 text-center">
              <Waves className="mx-auto mb-4 h-8 w-8 text-seafoam" />
              <h2 className="text-3xl font-bold text-foam mb-4">Ready to shape your board?</h2>
              <p className="mx-auto mb-8 max-w-md text-sm text-foam/80">Create your fund and start paper trading in under a minute.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="px-8 py-3">
                  <Link href="/dashboard/funds/new">Create my fund</Link>
                </Button>
                <Button variant="outline" asChild className="px-8 py-3">
                  <Link href="/dashboard/leaderboard">Explore funds</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/10 bg-ocean-800/50 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-foam/60">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> SurfDAO.ai — Experimental. Not financial advice.
            </div>
            <div className="flex gap-5">
              <Link href="#safety" className="hover:text-foam transition">Safety & custody</Link>
              <Link href="#how" className="hover:text-foam transition">Paper trading only</Link>
              <Link href="https://keeta.com" target="_blank" rel="noopener noreferrer" className="hover:text-foam transition">Keeta network</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surfboard-card px-4 py-4">
      <div className="text-2xl font-bold text-foam">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-foam/60">{label}</div>
    </div>
  )
}
