"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Waves } from "lucide-react"

export default function LoginPage() {
  const { signIn } = useSession()
  const { toast } = useToast()
  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [mode, setMode] = React.useState<"login" | "signup">("login")
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await signIn({ email, name: name || email.split("@")[0] })
      toast({ title: "Welcome aboard", description: "You're signed in." })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Try again", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ocean-900 text-foam relative wave-bg flex items-center justify-center px-4">
      <div className="wave-stripe" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-full bg-wave-blue" />
          <span className="font-bold text-2xl tracking-tighter">Surf<span className="text-sunset">DAO</span></span>
        </Link>
        <div className="surfboard-card p-8">
          <h1 className="text-2xl font-bold text-foam mb-2 text-center">
            {mode === "login" ? "Welcome back" : "Shape your board"}
          </h1>
          <p className="text-sm text-foam/70 mb-6 text-center">
            {mode === "login" ? "Sign in to your account." : "Create an account to start paper trading."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foam">Name</label>
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foam">Email</label>
              <Input type="email" placeholder="surfer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-foam/70">
            {mode === "login" ? "New to SurfDAO?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-wave-blue font-medium underline underline-offset-4"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foam/60">
            <Waves className="h-3 w-3" /> No passwords — dev session auth for the MVP.
          </div>
        </div>
      </div>
    </div>
  )
}
