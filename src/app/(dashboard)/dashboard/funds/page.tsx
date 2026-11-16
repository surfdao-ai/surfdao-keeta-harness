import { requireUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import FundCard from "@/components/fund-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"

export default async function MyFundsPage() {
  const session = await requireUser()
  const funds = await store.funds.findByOwner(session.user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foam">My funds</h1>
        <Button asChild>
          <a href="/dashboard/funds/new">
            <Plus className="h-4 w-4 mr-2" /> Shape a board
          </a>
        </Button>
      </div>

      {funds.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map((f) => (
            <FundCard key={f.id} {...f} />
          ))}
        </div>
      ) : (
        <div className="surfboard-card p-12 text-center">
          <Plus className="h-10 w-10 mx-auto text-foam/20 mb-4" />
          <h3 className="text-lg font-bold text-foam mb-2">No funds yet</h3>
          <p className="text-sm text-foam/50 mb-6">Shape your first board to start paper trading.</p>
          <Button asChild>
            <a href="/dashboard/funds/new">Create a fund</a>
          </Button>
        </div>
      )}
    </div>
  )
}
