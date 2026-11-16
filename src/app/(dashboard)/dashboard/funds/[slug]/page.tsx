import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { getPersona } from "@/lib/agents/personas"
import FundActions from "@/components/fund-actions"
import { WaveChart } from "@/components/wave-chart"
import Disclaimer from "@/components/disclaimer"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Users, DollarSign, TrendingUp } from "lucide-react"

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const fund = await store.funds.findBySlug(slug)
  if (!fund) notFound()
  const session = await getSession()
  const isOwner = session?.user.id === fund.ownerId
  const sessions = await store.fundSessions.byFund(fund.id)
  const allocations = await store.allocations.byFund(fund.id)
  const aum = allocations.reduce((sum, a) => sum + Number(a.amountUsdc), 0)

  // build chart series
  const chartData = [...sessions].reverse().map((s, i) => ({ t: i, v: Number(s.nav) }))
  if (chartData.length === 0) {
    for (let i = 0; i < 8; i++) chartData.push({ t: i, v: 10000 + Math.sin(i) * 120 })
  }
  const latest = sessions[0]
  const totalReturn = latest ? Number(latest.returnPct ?? 0) : 0
  const mandate = fund.mandate as { agents: { id: string; weight: number }[] }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foam">{fund.name}</h1>
            <Badge variant={fund.status === "live" ? "success" : "default"}>
              {fund.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-foam/60 max-w-2xl">{fund.description}</p>
        </div>
        <FundActions slug={fund.slug} fundName={fund.name} owner={!!isOwner} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/50 uppercase tracking-wider mb-3">
            <TrendingUp className="h-4 w-4" /> NAV
          </div>
          <div className="text-2xl font-bold text-foam">${Number(latest?.nav ?? 10000).toLocaleString()}</div>
          <div className={`text-sm font-medium mt-1 ${totalReturn >= 0 ? "text-seafoam" : "text-red-400"}`}>
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}% last session
          </div>
        </div>
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/50 uppercase tracking-wider mb-3">
            <DollarSign className="h-4 w-4" /> AUM
          </div>
          <div className="text-2xl font-bold text-foam">${aum.toLocaleString()}</div>
          <div className="text-sm text-foam/50 mt-1">USDC allocated</div>
        </div>
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/50 uppercase tracking-wider mb-3">
            <Users className="h-4 w-4" /> Allocators
          </div>
          <div className="text-2xl font-bold text-foam">{allocations.length}</div>
          <div className="text-sm text-foam/50 mt-1">community backers</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="surfboard-card p-6">
          <h2 className="text-lg font-bold text-foam mb-4">Performance wave</h2>
          <WaveChart data={chartData} />
          <p className="text-xs text-foam/40 mt-3">Simulated NAV across paper sessions.</p>
        </div>
        <div className="surfboard-card p-6">
          <h2 className="text-lg font-bold text-foam mb-4">Agent scorecard</h2>
          <div className="space-y-3">
            {(mandate?.agents ?? []).map((ref) => {
              const persona = getPersona(ref.id)
              const vote = (latest?.decisions as any)?.votes?.find((v: any) => v.agentId === ref.id)
              return (
                <div key={ref.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-seafoam" />
                  <span className="text-sm text-foam flex-1">{persona.name}</span>
                  <span className="text-xs text-foam/50">{ref.weight}%</span>
                  <span className="text-sm font-bold text-wave-blue">
                    {vote ? `${vote.score}/100` : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="surfboard-card p-6">
        <h2 className="text-lg font-bold text-foam mb-4">Recent sessions</h2>
        {sessions.length ? (
          <div className="space-y-3">
            {sessions.slice(0, 8).map((s) => {
              const checks = s.checks as { condition?: string; summary?: string } | null
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 text-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-seafoam" />
                    <span className="text-foam/70">Wave: <strong className="text-foam">{checks?.condition ?? "clear"}</strong></span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foam">${Number(s.nav).toLocaleString()}</div>
                    <div className="text-xs text-foam/50">
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-foam/50">No sessions yet. Run an advance to start the loop.</p>
        )}
      </div>

      <Disclaimer />
    </div>
  )
}
