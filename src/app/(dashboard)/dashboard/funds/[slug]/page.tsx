import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { fundStats } from "@/lib/fund-helpers"
import { getPersona } from "@/lib/agents/personas"
import FundActions from "@/components/fund-actions"
import LiveModeControl from "@/components/live-mode-control"
import VaultPanel from "@/components/vault-panel"
import InferenceSettings from "@/components/inference-settings"
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
  const [allSessions, allAllocations, allUsers] = await Promise.all([
    store.fundSessions.list(),
    store.allocations.list(),
    store.users.list(),
  ])
  const stats = fundStats(fund, allSessions, allAllocations)
  const sessions = allSessions
    .filter((s) => s.fundId === fund.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const allocations = allAllocations.filter(
    (a) => a.fundId === fund.id && a.status !== "withdrawn",
  )
  const aum = stats.aum
  const userById = new Map(allUsers.map((u) => [u.id, u]))

  // Real NAV history only — never fabricate points for an empty fund.
  const chartData = [...sessions].reverse().map((s, i) => ({ t: i, v: Number(s.nav) }))
  const latest = sessions[0]
  const totalReturn = stats.totalReturn
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
            <Badge variant={fund.isPublic ? "success" : "warning"}>
              {fund.isPublic ? "PUBLISHED" : "DRAFT"}
            </Badge>
            <Badge variant={fund.executionMode === "live" ? "destructive" : "default"}>
              {fund.executionMode === "live" ? "LIVE" : "PAPER"}
            </Badge>
          </div>
          <p className="text-foam/80 max-w-2xl">{fund.description}</p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <FundActions slug={fund.slug} fundName={fund.name} owner={!!isOwner} isPublic={!!fund.isPublic} />
          <LiveModeControl
            slug={fund.slug}
            owner={!!isOwner}
            mode={fund.executionMode ?? "paper"}
            wallet={fund.keetaWalletAddress}
            vault={fund.vaultAddress}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/70 uppercase tracking-wider mb-3">
            <TrendingUp className="h-4 w-4" /> NAV
          </div>
          <div className="text-2xl font-bold text-foam">${Number(latest?.nav ?? 10000).toLocaleString()}</div>
          <div className={`text-sm font-medium mt-1 ${totalReturn >= 0 ? "text-seafoam" : "text-red-400"}`}>
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}% all-time
          </div>
          {latest && (
            <div className={`text-xs mt-0.5 ${Number(latest.returnPct) >= 0 ? "text-seafoam/80" : "text-red-400/80"}`}>
              {Number(latest.returnPct) >= 0 ? "+" : ""}{Number(latest.returnPct).toFixed(2)}% last session
            </div>
          )}
        </div>
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/70 uppercase tracking-wider mb-3">
            <DollarSign className="h-4 w-4" /> AUM
          </div>
          <div className="text-2xl font-bold text-foam">${aum.toLocaleString()}</div>
          <div className="text-sm text-foam/70 mt-1">USDC allocated</div>
        </div>
        <div className="surfboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foam/70 uppercase tracking-wider mb-3">
            <Users className="h-4 w-4" /> Allocators
          </div>
          <div className="text-2xl font-bold text-foam">{allocations.length}</div>
          <div className="text-sm text-foam/70 mt-1">community backers</div>
        </div>
      </div>

      <div className="surfboard-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foam">Asset universe</h2>
          <span className="text-xs text-foam/70">
            Harness: {((fund.inferenceConfig as any)?.provider ?? "simulated") === "simulated" ? "Paper simulator" : "Your inference API"}
          </span>
        </div>
        {((fund.assets ?? []) as any[]).length ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {((fund.assets ?? []) as any[]).map((a) => {
                const target = (latest?.decisions as any)?.assetWeights?.[a.symbol]
                return (
                  <div key={a.symbol} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-foam">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                        {a.symbol} <span className="font-normal text-foam/70">{a.name}</span>
                      </span>
                      <span className="text-foam/80">set {a.weight}% · target {target ?? a.weight}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${target ?? a.weight}%`, background: a.color }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-foam/70">
                      <span>{a.address ? `${a.address.slice(0, 12)}…` : "Keeta base asset"}</span>
                      {(latest?.decisions as any)?.holdings?.find((h: any) => h.symbol === a.symbol)?.change24h != null && (
                        <span>
                          {((latest.decisions as any).holdings.find((h: any) => h.symbol === a.symbol).change24h >= 0 ? "+" : "")}
                          {(latest.decisions as any).holdings.find((h: any) => h.symbol === a.symbol).change24h.toFixed(2)}% last session
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center rounded-xl border border-white/10 bg-ocean-900/30 p-4">
              <div className="w-full space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-foam/70">Harness config</div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Agents</span><span className="text-foam">{((fund.mandate as any)?.agents ?? []).length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Provider</span><span className="text-foam">{(fund.inferenceConfig as any)?.provider ?? "simulated"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Custom endpoint</span><span className="text-foam">{(fund.inferenceConfig as any)?.endpoint ? "Yes" : "No"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Creator fee on gains</span><span className="text-seafoam">{(fund as any).performanceFeePct ?? 10}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Fee wallet</span><span className="truncate pl-2 text-foam">{(fund as any).feeWalletAddress ?? (fund as any).keetaWalletAddress ?? "Not set"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-foam/80">Visibility</span><span className="text-foam">{fund.isPublic ? "Public" : "Draft"}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foam/70">Legacy fund — no asset universe configured.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="surfboard-card p-6">
          <h2 className="text-lg font-bold text-foam mb-4">Performance wave</h2>
          {chartData.length > 1 ? (
            <WaveChart data={chartData} />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-foam/70">
              {chartData.length === 1 ? "One session so far — run more to see the wave" : "No sessions yet — run an advance to plot NAV"}
            </div>
          )}
          <p className="mt-3 text-xs text-foam/70">
            {chartData.length} recorded session{chartData.length === 1 ? "" : "s"} · real stored NAV, no simulated points.
          </p>
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
                  <span className="text-xs text-foam/70">{ref.weight}%</span>
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
        <h2 className="text-lg font-bold text-foam mb-4">Public thesis feed</h2>
        {latest && (latest.decisions as any)?.votes?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {((latest.decisions as any).votes as any[]).slice(0, 6).map((v: any) => (
              <div key={v.agentId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-wave-blue">{v.agentName}</span>
                  <Badge variant={v.score >= 50 ? "success" : "warning"}>{v.score}/100</Badge>
                </div>
                <p className="text-sm text-foam/90">{v.thesis}</p>
                {v.risks?.length ? (
                  <p className="mt-2 text-xs text-foam/70">Risks: {(v.risks as string[]).join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foam/70">No theses yet. Run an advance to generate agent theses.</p>
        )}
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
                    <span className="text-foam/90">Wave: <strong className="text-foam">{checks?.condition ?? "clear"}</strong></span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foam">${Number(s.nav).toLocaleString()}</div>
                    <div className="text-xs text-foam/70">
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-foam/70">No sessions yet. Run an advance to start the loop.</p>
        )}
      </div>

      <div className="surfboard-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foam">
            <Users className="h-5 w-5 text-seafoam" /> Allocations
          </h2>
          <Badge variant="success">{allocations.length} active</Badge>
        </div>
        {allocations.length ? (
          <div className="divide-y divide-white/5">
            {[...allocations]
              .sort((a, b) => b.allocatedAt.localeCompare(a.allocatedAt))
              .map((a) => {
                const allocator = userById.get(a.allocatorUserId)
                const isMine = session?.user.id === a.allocatorUserId
                const displayName = a.allocatorName ?? allocator?.name ?? (isMine ? session?.user.name : null) ?? "Unknown surfer"
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wave-blue/15 text-xs font-bold text-wave-blue">
                        {(allocator?.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foam">
                          {displayName} {isMine && <span className="text-seafoam">(you)</span>}
                        </div>
                        <div className="text-xs text-foam/70">
                          {new Date(a.allocatedAt).toLocaleString()} · {a.keetaTxHash ? "on-chain" : "paper"}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-seafoam">${Number(a.amountUsdc).toLocaleString()}</div>
                      <div className="text-xs text-foam/70 capitalize">{a.status}</div>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <p className="text-sm text-foam/70">
            No allocations yet. Be the first to drop into this board.
          </p>
        )}
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">Harness settings</h2>
        <InferenceSettings
          slug={fund.slug}
          owner={!!isOwner}
          config={{
            provider: (fund.inferenceConfig as any)?.provider ?? "simulated",
            model: (fund.inferenceConfig as any)?.model ?? "surfdao-paper",
            hasCustomEndpoint: Boolean((fund.inferenceConfig as any)?.endpoint),
            hasApiKey: Boolean((fund.inferenceConfig as any)?.encryptedApiKey),
          }}
        />
      </div>

      <div className="surfboard-card p-6">
        <h2 className="mb-4 text-lg font-bold text-foam">On-chain vault &amp; withdrawals</h2>
        <VaultPanel
          slug={fund.slug}
          owner={!!isOwner}
          canWithdraw={!!session && !isOwner}
          withdrawable={allocations
            .filter((a) => a.allocatorUserId === session?.user.id)
            .reduce((s, a) => s + Number(a.amountUsdc), 0)}
        />
      </div>

      <Disclaimer />
    </div>
  )
}
