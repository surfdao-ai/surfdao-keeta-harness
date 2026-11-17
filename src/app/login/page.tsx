"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Waves, Lock, Mail, User as UserIcon } from "lucide-react"

export default function LoginPage() {
  const { signIn } = useSession()
  const { toast } = useToast()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [name, setName] = React.useState("")
  const [mode, setMode] = React.useState<"login" | "signup">("login")
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      await signIn({ email, password, name: name || undefined }, mode)
      toast({ title: mode === "signup" ? "Welcome aboard" : "Welcome back", description: "You're signed in." })
    } catch (e: any) {
      toast({ title: "Sign in failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ocean-900 px-4 text-foam wave-bg">
      <div className="wave-stripe" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-7 w-7 rounded-full bg-wave-blue" />
          <span className="text-2xl font-bold tracking-tighter">Surf<span className="text-sunset">DAO</span></span>
        </Link>
        <div className="surfboard-card p-8 shadow-2xl shadow-black/40">
          <h1 className="mb-2 text-center text-2xl font-bold text-foam">
            {mode === "login" ? "Welcome back" : "Shape your board"}
          </h1>
          <p className="mb-6 text-center text-sm text-foam/80">
            {mode === "login" ? "Sign in to your account." : "Create an account to start paper trading."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foam">Display name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-foam/60" />
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-foam/60" />
                <Input type="email" placeholder="surfer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-foam/60" />
                <Input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={8} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-foam/80">
            {mode === "login" ? "New to SurfDAO?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-wave-blue underline underline-offset-4"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foam/60">
            <Waves className="h-3 w-3" /> Experimental paper trading. You control your own wallet.
          </div>
        </div>
      </div>
    </div>
  )
}
