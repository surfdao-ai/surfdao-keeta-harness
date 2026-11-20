import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Waves, Compass } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean-900 px-6 text-foam wave-bg relative overflow-hidden">
      <div className="wave-stripe" />
      <div className="relative z-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-seafoam/10 text-seafoam">
            <Waves className="h-8 w-8" />
          </div>
        </div>
        <p className="text-6xl font-black tracking-tight text-white/15 select-none">404</p>
        <h1 className="mt-2 text-2xl font-bold text-foam">Wiped out on the rocks</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-foam/80">
          The page you&apos;re paddling for doesn&apos;t exist — it may have been unpublished, or the link is a rogue wave.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard"><Compass className="mr-2 h-4 w-4" /> Back to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">View leaderboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
