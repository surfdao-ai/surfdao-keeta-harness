import type { ReactNode } from "react"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard-shell"

export const dynamic = "force-dynamic"

/* --------------------------------------------------------------------------
   Auth gate for every /dashboard/* page (server component). Anonymous
   visitors are sent to /login with a ?next= return path so sign-in lands
   them back on the page they wanted.
--------------------------------------------------------------------------- */
export default async function DashboardRouteLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()
  if (!session) {
    // Layouts cannot read searchParams; the return path is optional.
    redirect("/login")
  }
  return <DashboardShell>{children}</DashboardShell>
}
