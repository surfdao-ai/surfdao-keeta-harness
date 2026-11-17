"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AGENT_PERSONAS } from "@/lib/agents/personas"
import {
  UserRound, Wallet, MapPin, Link as LinkIcon, AtSign, Save, Pencil, X,
  Flag, Droplets, Activity, TrendingUp,
} from "lucide-react"

type FundRow = { id: string; name: string; slug: string; status: string; createdAt: string; sessions: number; aum: number; latestReturn: number }
type AllocationRow = { id: string; fundName: string; fundSlug: string; amountUsdc: number; status: string; allocatedAt: string }
type ActivityRow = { id: string; fundName: string; fundSlug: string; nav: number; returnPct: number; timestamp: string }
type ActivityData = { funds: FundRow[]; allocations: AllocationRow[]; activity: ActivityRow[] }

type Tab = "overview" | "funds" | "allocations" | "activity"

export default function ProfilePage() {
  const { user, loading } = useSession()
  const { toast } = useToast()
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [tab, setTab] = React.useState<Tab>("overview")
  const [data, setData] = React.useState<ActivityData>({ funds: [], allocations: [], activity: [] })
  const [dataLoading, setDataLoading] = React.useState(true)
  const [form, setForm] = React.useState({
    name: "", bio: "", keetaAddress: "", location: "", website: "", twitter: "",
    favoriteStrategies: [] as string[],
  })

  const loadActivity = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile/activity")
      if (res.ok) setData(await res.json())
    } catch {} finally { setDataLoading(false) }
  }, [])

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
      loadActivity()
    }
  }, [user, loadActivity])

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
      setEditing(false)
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Try again", variant: "destructive" })
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-foam/80">Loading profile…</p>
  if (!user) {
    return (
      <div className="surfboard-card mx-auto max-w-md p-8 text-center">
        <UserRound className="mx-auto mb-4 h-10 w-10 text-wave-blue" />
        <h1 className="text-xl font-bold text-foam">Sign in to view your profile</h1>
        <p className="mt-2 text-sm text-foam/80">Your surfer profile is tied to your account.</p>
        <Button asChild className="mt-6"><a href="/login">Sign in</a></Button>
      </div>
    )
  }

  const initial = (form.name || user.email || "U").charAt(0).toUpperCase()
  const totalAum = data.allocations.filter((a) => a.status !== "withdrawn").reduce((s, a) => s + a.amountUsdc, 0)
  const myAum = data.funds.reduce((s, f) => s + f.aum, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foam">Your profile</h1>
          <p className="mt-1 text-foam/80">Your boards, your drops in, your wave.</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit profile
          </Button>
        )}
      </div>

      {/* Header card */}
      <div className="surfboard-card overflow-hidden p-0">
        <div className="h-24 bg-gradient-to-r from-wave-blue via-seafoam to-sunset opacity-80" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-ocean-800 bg-gradient-to-br from-wave-blue to-seafoam text-3xl font-bold text-white shadow-lg">
            {initial}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foam">{form.name || user.email}</h2>
            <p className="text-sm text-foam/80">{user.email}</p>
            {(user as any).bio && <p className="mt-1 text-sm text-foam/90 max-w-xl">{(user as any).bio}</p>}
          </div>
          <Badge variant="success" className="self-start">Paper surfer</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Flag className="h-5 w-5" />} label="Funds created" value={data.funds.length} />
        <Stat icon={<Droplets className="h-5 w-5" />} label="Allocations" value={data.allocations.length} />
        <Stat icon={<Activity className="h-5 w-5" />} label="Sessions" value={data.activity.length} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="AUM attracted" value={`$${myAum.toLocaleString()}`} />
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-6">
          <div className="surfboard-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-blue/15 text-wave-blue">
                  <UserRound className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-foam">About you</h2>
              </div>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></Field>
              <Field label="Email" readOnly><Input value={user.email} readOnly className="opacity-70" /></Field>
              <Field label="Location" icon={<MapPin className="h-4 w-4" />}><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lisbon, Portugal" /></Field>
              <Field label="Website" icon={<LinkIcon className="h-4 w-4" />}><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></Field>
              <Field label="X / Twitter" icon={<AtSign className="h-4 w-4" />}><Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="handle" /></Field>
              <Field label="Keeta wallet" icon={<Wallet className="h-4 w-4" />}><Input value={form.keetaAddress} onChange={(e) => setForm({ ...form, keetaAddress: e.target.value })} placeholder="keeta_…" /></Field>
              <div className="sm:col-span-2">
                <Field label="Bio">
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="What's your investing philosophy?" className="flex min-h-24 w-full rounded-xl border border-white/15 bg-ocean-900/40 px-3 py-2 text-sm text-foam placeholder:text-foam/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/60" />
                </Field>
              </div>
            </div>
          </div>
          <div className="surfboard-card p-6">
            <h2 className="mb-1 text-lg font-bold text-foam">Favorite strategies</h2>
            <p className="mb-4 text-sm text-foam/80">Pick the styles that match your approach.</p>
            <div className="flex flex-wrap gap-2">
              {AGENT_PERSONAS.map((persona) => {
                const active = form.favoriteStrategies.includes(persona.id)
                return (
                  <button type="button" key={persona.id} onClick={() => toggleStrategy(persona.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-seafoam/50 bg-seafoam/10 text-seafoam" : "border-white/15 bg-white/[0.02] text-foam/80 hover:border-white/30"}`}>
                    {persona.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : <><Save className="mr-2 h-4 w-4" /> Save changes</>}</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ocean-800/40 p-1">
            {([["overview", "Overview"], ["funds", "My Funds"], ["allocations", "Allocations"], ["activity", "Activity"]] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-wave-blue text-white" : "text-foam/80 hover:bg-white/5"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="surfboard-card p-6">
            {dataLoading ? <p className="text-foam/80">Loading activity…</p> : (
              <>
                {tab === "overview" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-foam">Overview</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Your drops in" value={`$${totalAum.toLocaleString()}`} />
                      <MiniStat label="Funds created" value={String(data.funds.length)} />
                      <MiniStat label="Strategy picks" value={String(((user as any).favoriteStrategies ?? []).length)} />
                    </div>
                    <p className="text-sm text-foam/80">
                      Use the tabs above to review every board you&apos;ve shaped, every fund you&apos;ve
                      dropped into, and your paper-trading session history.
                    </p>
                  </div>
                )}
                {tab === "funds" && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold text-foam">Funds you created</h2>
                    {data.funds.length ? data.funds.map((f) => (
                      <Link key={f.id} href={`/dashboard/funds/${f.slug}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-seafoam/40 hover:bg-white/5">
                        <div>
                          <div className="font-semibold text-foam">{f.name}</div>
                          <div className="text-xs text-foam/70">{f.sessions} sessions · created {new Date(f.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-seafoam">${f.aum.toLocaleString()}</div>
                          <div className={`text-xs ${f.latestReturn >= 0 ? "text-seafoam" : "text-red-400"}`}>{f.latestReturn >= 0 ? "+" : ""}{f.latestReturn.toFixed(2)}%</div>
                        </div>
                      </Link>
                    )) : <p className="text-sm text-foam/70">No funds yet. <Link href="/dashboard/funds/new" className="text-wave-blue underline">Shape your first board.</Link></p>}
                  </div>
                )}
                {tab === "allocations" && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold text-foam">Your allocations</h2>
                    {data.allocations.length ? data.allocations.map((a) => (
                      <Link key={a.id} href={`/dashboard/funds/${a.fundSlug}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-seafoam/40 hover:bg-white/5">
                        <div>
                          <div className="font-semibold text-foam">{a.fundName}</div>
                          <div className="text-xs text-foam/70">{new Date(a.allocatedAt).toLocaleString()} · <span className="capitalize">{a.status}</span></div>
                        </div>
                        <div className="text-sm font-bold text-seafoam">${a.amountUsdc.toLocaleString()}</div>
                      </Link>
                    )) : <p className="text-sm text-foam/70">No allocations yet. <Link href="/dashboard/allocate" className="text-wave-blue underline">Explore funds.</Link></p>}
                  </div>
                )}
                {tab === "activity" && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold text-foam">Paper-trading sessions</h2>
                    {data.activity.length ? data.activity.map((s) => (
                      <Link key={s.id} href={`/dashboard/funds/${s.fundSlug}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-seafoam/40 hover:bg-white/5">
                        <div>
                          <div className="font-semibold text-foam">{s.fundName}</div>
                          <div className="text-xs text-foam/70">{new Date(s.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-foam">${s.nav.toLocaleString()}</div>
                          <div className={`text-xs ${s.returnPct >= 0 ? "text-seafoam" : "text-red-400"}`}>{s.returnPct >= 0 ? "+" : ""}{s.returnPct.toFixed(2)}%</div>
                        </div>
                      </Link>
                    )) : <p className="text-sm text-foam/70">No sessions yet. Run an advance on one of your boards.</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="surfboard-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foam/70">{icon}{label}</div>
      <div className="text-xl font-bold text-foam">{value}</div>
    </div>
  )
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-xs text-foam/70">{label}</div>
      <div className="mt-1 text-lg font-bold text-foam">{value}</div>
    </div>
  )
}
function Field({ label, icon, readOnly, children }: { label: string; icon?: React.ReactNode; readOnly?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foam">{icon} {label} {readOnly && <span className="text-xs font-normal text-foam/70">(read only)</span>}</label>
      {children}
    </div>
  )
}
