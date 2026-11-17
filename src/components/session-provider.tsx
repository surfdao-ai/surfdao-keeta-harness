"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

export type SessionUser = {
  id: string
  email: string
  name?: string
  keetaAddress?: string
}

type SessionContextType = {
  user: SessionUser | null
  loading: boolean
  signIn: (user: { email: string; password: string; name?: string }, mode: "login" | "signup") => Promise<boolean>
  signOut: () => void
}

const SessionContext = React.createContext<SessionContextType>({
  user: null,
  loading: true,
  signIn: async () => false,
  signOut: () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const loadSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/login", { credentials: "include" })
      if (res.ok) {
        const json = await res.json()
        if (json.ok && json.user) setUser(json.user)
      }
    } catch {
      // no session
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadSession()
  }, [loadSession])

  async function signIn(
    user: { email: string; password: string; name?: string },
    mode: "login" | "signup",
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Sign in failed")
      if (json.user) setUser(json.user)
      router.push("/dashboard")
      return true
    } catch (e: any) {
      throw e
    }
  }

  async function signOut() {
    setUser(null)
    try {
      await fetch("/api/auth/logout", { method: "DELETE" })
    } catch {}
    router.push("/")
  }

  return (
    <SessionContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
