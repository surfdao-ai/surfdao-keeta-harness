"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Waves, AlertCircle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[surfdao] unexpected error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean-900 px-6 text-foam">
      <div className="surfboard-card w-full max-w-md p-8 text-center shadow-2xl shadow-black/30">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset/15 text-sunset">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foam">We hit a rough patch</h1>
        <p className="mt-2 text-sm text-foam/80">
          Something unexpected happened. Your funds and allocations are safe — try again.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-foam/80">
          <Waves className="h-3 w-3" /> SurfDAO.ai — experimental paper trading
        </div>
      </div>
    </div>
  )
}
