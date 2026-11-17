import { getSession } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import FundCard from "@/components/fund-card"
import Disclaimer from "@/components/disclaimer"
import { Waves, TrendingUp, DollarSign, Flag } from "lucide-react"

export default async function DashboardPage() {
  const session = await getSession()
  const funds = await store.funds.list()
  const userFunds = session ? funds.filter((f) => f.ownerId === session.user.id) : []
  const sessions = await store.fundSessions.list()
  const allocations = await store.allocations.list()

  const totalAUM = allocations.reduce((sum, a) => sum + Number(a.amountUsdc), 0)
  const latestNav = userFunds.length
    ? sessions.filter((s) => userFunds.some((f) => f.id === s.fundId))[0]?.nav ?? 10000
    : 10000

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foam">Your dashboard</h1>
        <p className="text-foam/80 mt-1">
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
                <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sunset">
                  {process.env.LIVE_MODE === "true" ? "Live" : "Paper"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-foam/80">
                {process.env.LIVE_MODE === "true"
                  ? "Live Keeta execution is enabled. Verify your wallet and vault before allocating."
                  : "All funds, agents, NAV, and allocations are simulated. No real funds move."}
              </p>
            </div>
          </div>
          <div className="text-xs text-foam/70 sm:max-w-sm sm:text-right">
            To go live: set <code className="rounded bg-white/10 px-1">LIVE_MODE=true</code>, connect a
            funded Keeta wallet, deploy an audited vault, and set <code className="rounded bg-white/10 px-1">COOKIE_SECRET</code>.
            See the README.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Funds" value={userFunds.length} icon={<Flag className="h-5 w-5" />} color="text-wave-blue" />
        <StatCard title="Total AUM" value={`$${totalAUM.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} color="text-seafoam" />
        <StatCard title="Latest NAV" value={`$${Number(latestNav).toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} color="text-sunset" />
        <StatCard title="Sessions" value={sessions.filter((s) => userFunds.some((f) => f.id === s.fundId)).length} icon={<Waves className="h-5 w-5" />} color="text-slate-400" />
      </div>

      <div className="surfboard-card p-6">
        <h2 className="text-lg font-bold text-foam mb-4">My funds</h2>
        {userFunds.length ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userFunds.map((f) => (
              <FundCard key={f.id} {...f} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-foam/70 mb-4">No funds yet. Shape your first board.</p>
            <a href="/dashboard/funds/new" className="text-wave-blue font-medium underline underline-offset-4 hover:text-wave-blue/80 transition">Create a fund →</a>
          </div>
        )}
      </div>

      <Disclaimer variant="short" />
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="surfboard-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
        <h3 className="text-xs font-medium text-foam/70 uppercase tracking-wider">{title}</h3>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
