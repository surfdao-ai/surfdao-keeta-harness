"use client"

import * as React from "react"
import { useSession } from "@/components/session-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AGENT_PERSONAS } from "@/lib/agents/personas"
import { UserRound, Wallet, MapPin, Link as LinkIcon, AtSign, Save, Check, Sparkles } from "lucide-react"

export default function ProfilePage() {
  const { user, loading } = useSession()
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    name: "",
    bio: "",
    keetaAddress: "",
    location: "",
    website: "",
    twitter: "",
    favoriteStrategies: [] as string[],
  })

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        bio: (user as any).bio ?? "",
        keetaAddress: user.keetaAddress ?? "",
        location: (user as any).location ?? "",
        website: (user as any).website ?? "",
        twitter: (user as any).twitter ?? "",
        favoriteStrategies: (user as any).favoriteStrategies ?? [],
      })
    }
  }, [user])

  function toggleStrategy(id: string) {
    setForm((f) => ({
      ...f,
      favoriteStrategies: f.favoriteStrategies.includes(id)
        ? f.favoriteStrategies.filter((s) => s !== id)
        : [...f.favoriteStrategies, id],
    }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Could not save profile")
      toast({ title: "Profile saved", description: "Your surfer profile is up to date." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-foam/80">Loading profile…</p>
  if (!user) return null

  const initial = (form.name || user.email || "U").charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-wave-blue/30 bg-wave-blue/10 px-3 py-1 text-xs font-medium text-wave-blue">
          <Sparkles className="h-3 w-3" /> Surfer profile
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foam">Your profile</h1>
        <p className="mt-1 text-foam/80">Tell the community who's behind the board.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Avatar banner */}
        <div className="surfboard-card overflow-hidden p-0">
          <div className="h-24 bg-gradient-to-r from-wave-blue via-seafoam to-sunset opacity-80" />
          <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-ocean-800 bg-gradient-to-br from-wave-blue to-seafoam text-3xl font-bold text-white shadow-lg">
              {initial}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foam">{form.name || user.email}</h2>
              <p className="text-sm text-foam/80">{user.email}</p>
            </div>
            <Badge variant="success" className="self-start">Paper surfer</Badge>
          </div>
        </div>

        <div className="surfboard-card p-6 shadow-xl shadow-black/20">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue">
              <UserRound className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-foam">About you</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </Field>
            <Field label="Email" readOnly>
              <Input value={user.email} readOnly className="opacity-70" />
            </Field>
            <Field label="Location" icon={<MapPin className="h-4 w-4" />}>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lisbon, Portugal" />
            </Field>
            <Field label="Website" icon={<LinkIcon className="h-4 w-4" />}>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="X / Twitter" icon={<AtSign className="h-4 w-4" />}>
              <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="handle" />
            </Field>
            <Field label="Keeta wallet" icon={<Wallet className="h-4 w-4" />}>
              <Input value={form.keetaAddress} onChange={(e) => setForm({ ...form, keetaAddress: e.target.value })} placeholder="keeta_…" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bio">
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="What's your investing philosophy?"
                  className="flex min-h-24 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 py-2 text-sm text-foam placeholder:text-foam/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/60"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="surfboard-card p-6 shadow-xl shadow-black/20">
          <h2 className="mb-1 text-lg font-bold text-foam">Favorite strategies</h2>
          <p className="mb-4 text-sm text-foam/80">Pick the styles that match your approach.</p>
          <div className="flex flex-wrap gap-2">
            {AGENT_PERSONAS.map((persona) => {
              const active = form.favoriteStrategies.includes(persona.id)
              return (
                <button
                  type="button"
                  key={persona.id}
                  onClick={() => toggleStrategy(persona.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-seafoam/50 bg-seafoam/10 text-seafoam"
                      : "border-white/15 bg-white/[0.02] text-foam/80 hover:border-white/30"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                  {persona.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-8">
            {saving ? "Saving…" : <><Save className="mr-2 h-4 w-4" /> Save profile</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  icon,
  readOnly,
  children,
}: {
  label: string
  icon?: React.ReactNode
  readOnly?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foam">
        {icon} {label} {readOnly && <span className="text-xs font-normal text-foam/60">(read only)</span>}
      </label>
      {children}
    </div>
  )
}
