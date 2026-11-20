import { NextResponse } from "next/server"
import { pgEnabled, pingDb } from "@/lib/db/pg-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/* Liveness probe for Vercel health checks. Deliberately exposes no data. */
export async function GET() {
  let db: "ok" | "error" | "file-store" = "file-store"
  if (pgEnabled()) db = (await pingDb()) ? "ok" : "error"
  const ok = db !== "error"
  return NextResponse.json(
    { ok, db, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  )
}
