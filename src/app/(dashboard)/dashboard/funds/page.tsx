import { requireUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { fundStats, publicFund } from "@/lib/fund-helpers"
import FundCard from "@/components/fund-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MyFundsPage() {
  const session = await requireUser()
  const [funds, sessions, allocations] = await Promise.all([
    store.funds.findByOwner(session.user.id),
    store.fundSessions.list(),
    store.allocations.list(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foam">My funds</h1>
        <Button asChild>
          <a href="/dashboard/funds/new"><Plus className="mr-2 h-4 w-4" /> Shape a board</a>
        </Button>
      </div>

      {funds.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funds.map((f) => {
            const stats = fundStats(f, sessions, allocations)
            return (
              <FundCard
                key={f.id}
                {...publicFund(f)}
                mode={f.executionMode}
                totalReturn={stats.totalReturn}
                aum={stats.aum}
                allocators={stats.allocators}
              />
            )
          })}
        </div>
      ) : (
        <div className="surfboard-card p-12 text-center">
          <Plus className="mx-auto mb-4 h-10 w-10 text-foam/30" />
          <h3 className="mb-2 text-lg font-bold text-foam">No funds yet</h3>
          <p className="mb-6 text-sm text-foam/70">Shape your first board to start paper trading.</p>
          <Button asChild><a href="/dashboard/funds/new">Create a fund</a></Button>
        </div>
      )}
    </div>
  )
}
