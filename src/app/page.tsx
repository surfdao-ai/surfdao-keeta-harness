import Link from "next/link"
import { ArrowRight, Compass, Flag, ShieldCheck, Waves, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ocean-900 text-foam relative wave-bg overflow-hidden">
      <div className="wave-stripe" />
      <div className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-wave-blue" />
            <span className="font-bold text-2xl tracking-tighter">Surf<span className="text-sunset">DAO</span></span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-foam/80">
            <Link href="/dashboard" className="hover:text-wave-blue transition">Dashboard</Link>
            <Link href="/dashboard/leaderboard" className="hover:text-wave-blue transition">Leaderboard</Link>
            <Link href="#how" className="hover:text-wave-blue transition">How it works</Link>
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
          <section className="max-w-7xl mx-auto px-6 py-24 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-seafoam mb-6">
              <Waves className="h-3 w-3" /> Paper trading live on Keeta test harness
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Surf the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wave-blue via-seafoam to-sunset">
                AI agent markets
              </span>
            </h1>
            <p className="text-lg md:text-xl text-foam/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Launch your own AI-agent hedge fund ("board"), run paper-trading sessions with KeeSpecs
              safety checks, and allocate USDC into other funds on Keeta mainnet. A living marketplace of
              strategies — built on the surf.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="px-8 py-3 text-lg">
                <Link href="/dashboard/funds/new">Create a fund</Link>
              </Button>
              <Button variant="outline" asChild className="px-8 py-3 text-lg">
                <Link href="/dashboard/leaderboard">View leaderboard</Link>
              </Button>
            </div>
          </section>

          <section id="how" className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-3xl font-bold text-foam mb-16 text-center">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Flag,
                  title: "Shape your board",
                  body: "Name your fund, pick strategy agents (Deep Value, Disruptive Growth, Contrarian Value, Quality Moat…), set risk parameters, and link your Keeta wallet.",
                },
                {
                  icon: ShieldCheck,
                  title: "Run with KeeSpecs",
                  body: "Each advance runs the agent pipeline, then KeeSpecs x402 safety checks before any action. Wave conditions: clear / caution / hold.",
                },
                {
                  icon: Users,
                  title: "Attract capital",
                  body: "Successful funds hit the public leaderboard. Anyone can allocate USDC into your fund — performance and AUM drive your rank.",
                },
              ].map((step) => (
                <div key={step.title} className="surfboard-card p-6">
                  <div className="w-10 h-10 rounded-xl bg-wave-blue/10 flex items-center justify-center text-wave-blue mb-4">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foam mb-2">{step.title}</h3>
                  <p className="text-sm text-foam/80 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
            <div className="surfboard-card p-8 md:p-12">
              <h2 className="text-2xl font-bold text-foam mb-4">Ready to shape your board?</h2>
              <p className="text-sm text-foam/80 mb-8">Create your fund and start paper trading in under a minute.</p>
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
            <span>SurfDAO.ai — Experimental. Not financial advice.</span>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-foam transition">Disclaimers</Link>
              <Link href="#" className="hover:text-foam transition">Paper trading only</Link>
              <Link href="#" className="hover:text-foam transition">Keeta mainnet</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
