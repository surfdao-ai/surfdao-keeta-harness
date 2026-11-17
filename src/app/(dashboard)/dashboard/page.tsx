import Link from "next/link"
import { getSession } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { fundStats, publicFund } from "@/lib/fund-helpers"
import FundCard from "@/components/fund-card"
import Disclaimer from "@/components/disclaimer"
import { Waves, TrendingUp, DollarSign, Flag, ArrowRight, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()
  const userId = session?.user.id
  const [funds, sessions, allocations] = await Promise.all([
    store.funds.list(),
    store.fundSessions.list(),
    store.allocations.list(),
  ])
  const userFunds = userId ? funds.filter((f) => f.ownerId === userId) : []
  const userFundIds = new Set(userFunds.map((f) => f.id))
  const mySessions = sessions
    .filter((s) => userFundIds.has(s.fundId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const stats = userFunds.map((f) => ({ fund: f, ...fundStats(f, sessions, allocations) }))
  const totalAum = stats.reduce((s, x) => s + x.aum, 0)
  const mostRecentSession = stats.reduce<typeof sessions[number] | null>((best, x) => {
    if (!x.latestSession) return best
    if (!best || x.latestSession.timestamp > best.timestamp) return x.latestSession
    return best
  }, null)
  const latestNav = mostRecentSession ? Number(mostRecentSession.nav) : 10000
  const live = process.env.LIVE_MODE === "true"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foam">Your dashboard</h1>
        <p className="mt-1 text-foam/80">
          Welcome back{session ? `, ${session.user.name ?? session.user.email}` : ""}. Your boards and sessions live here.
        </p>
      </div>

      <div className="surfboard-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seafoam/15 text-seafoam">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foam">Execution mode</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${live ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-seafoam/40 bg-seafoam/10 text-seafoam"}`}>
                  {live ? "LIVE" : "PAPER"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-foam/80">
                {live
                  ? "Live Keeta execution is enabled. Verify your wallet and vault before allocating."
                  : "All NAV, returns, theses, and allocations are simulated. No real funds move."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/live-mode" className="flex items-center gap-1.5 text-xs font-medium text-wave-blue hover:underline">
            <BookOpen className="h-3.5 w-3.5" /> How to enable live mode <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Funds" value={userFunds.length} icon={<Flag className="h-5 w-5" />} color="text-wave-blue" />
        <StatCard title="AUM attracted" value={`$${totalAum.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} color="text-seafoam" />
        <StatCard title="Latest NAV" value={`$${Number(latestNav).toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} color="text-sunset" />
        <StatCard title="Sessions" value={mySessions.length} icon={<Waves className="h-5 w-5" />} color="text-slate-300" />
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">My funds</h2>
        {stats.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ fund, totalReturn, aum, allocators }) => (
              <FundCard key={fund.id} {...publicFund(fund)} totalReturn={totalReturn} aum={aum} allocators={allocators} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="mb-4 text-foam/70">No funds yet. Shape your first board.</p>
            <Link href="/dashboard/funds/new" className="font-medium text-wave-blue underline underline-offset-4">Create a fund →</Link>
          </div>
        )}
      </div>

      <div className="surfboard-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foam"><Waves className="h-5 w-5 text-seafoam" /> Recent sessions</h2>
          <Link href="/dashboard/profile" className="text-xs text-wave-blue hover:underline">All activity →</Link>
        </div>
        {mySessions.length ? (
          <div className="divide-y divide-white/5">
            {mySessions.slice(0, 6).map((s) => {
              const fund = userFunds.find((f) => f.id === s.fundId)
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
                    <div className={`text-xs ${ret >= 0 ? "text-seafoam" : "text-red-400"}`}>{ret >= 0 ? "+" : ""}{ret.toFixed(2)}%</div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-foam/70">No sessions yet. Run an advance on one of your boards to start the loop.</p>
        )}
      </div>

      <Disclaimer variant="short" />
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="surfboard-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">{icon}</div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-foam/70">{title}</h3>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
