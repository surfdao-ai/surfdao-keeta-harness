"use client"

import * as React from "react"
import { useSession } from "@/components/session-provider"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Flag, Trophy, Droplets, LogOut, Menu, UserRound } from "lucide-react"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/funds/new", label: "Create Fund", icon: Flag },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/allocate", label: "Allocate", icon: Droplets },
] as const

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useSession()
  const { toast } = useToast()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  function handleSignOut() {
    signOut()
    toast({ title: "Signed out", description: "Paddle back soon." })
  }

  return (
    <div className="flex min-h-screen bg-ocean-900 text-foam">
      <aside
        className={`fixed left-0 top-0 bottom-0 z-20 w-16 border-r border-white/5 bg-ocean-800/95 backdrop-blur transition-all duration-300 lg:w-60 ${
          collapsed ? "lg:w-16" : ""
        }`}
      >
        <div className="flex h-14 items-center gap-3 border-b border-white/5 px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 shrink-0 rounded-full bg-wave-blue" />
            <span className={`font-bold text-xl tracking-tighter whitespace-nowrap text-foam ${collapsed ? "hidden" : "hidden lg:inline"}`}>
              Surf<span className="text-sunset">DAO</span>
            </span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden shrink-0 rounded-lg p-1.5 hover:bg-white/5 transition lg:block"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition lg:px-4 ${
                  active
                    ? "border border-wave-blue/40 bg-wave-blue/15 text-wave-blue"
                    : "text-foam/90 hover:bg-white/5 hover:text-foam"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={collapsed ? "hidden" : "hidden lg:inline"}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-3">
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 lg:px-4"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "hidden" : "hidden lg:inline"}>Sign out</span>
          </button>
          <Link
            href="/dashboard/profile"
            title="Your profile"
            className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5 lg:px-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seafoam/20 text-xs font-bold text-seafoam ring-1 ring-seafoam/40">
              {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 ${collapsed ? "hidden" : "hidden lg:block"}`}>
              <div className="flex items-center gap-1 truncate text-sm font-medium text-foam">
                {user?.name ?? user?.email}
                <UserRound className="h-3 w-3 text-foam/70" />
              </div>
              <div className="truncate text-xs text-foam/70">{user?.keetaAddress ?? "Complete your profile"}</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="relative ml-16 min-w-0 flex-1 lg:ml-60">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-ocean-900/80 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="hidden items-center gap-4 lg:flex">
              <h1 className="text-xl font-bold tracking-tight text-foam">SurfDAO.ai</h1>
              <span className="h-5 w-px bg-white/20" />
              <span className="text-xs font-medium text-seafoam">Paper trading • Keeta test harness</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/leaderboard" className="hidden text-xs font-medium text-foam/90 underline-offset-4 transition hover:text-foam sm:inline">
                Public Leaderboard
              </Link>
            </div>
          </div>
        </div>
        <main className="p-4 pb-20 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
