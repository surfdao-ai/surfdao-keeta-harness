import { getSession } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import DashboardView from "@/components/dashboard-view"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()
  const [funds, sessions, allocations] = await Promise.all([
    store.funds.list(),
    store.fundSessions.list(),
    store.allocations.list(),
  ])
  const userId = session?.user.id
  return (
    <DashboardView
      user={session?.user ?? null}
      funds={userId ? funds.filter((f) => f.ownerId === userId) : []}
      sessions={sessions}
      allocations={allocations}
      liveEnabled={process.env.LIVE_MODE === "true"}
    />
  )
}
