import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth"
import { store } from "@/lib/db/schema"
import { liveReadiness } from "@/lib/live-mode"

export async function GET(req: Request) {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const slug = new URL(req.url).searchParams.get("slug")
  const fund = slug ? await store.funds.findBySlug(slug) : null
  return NextResponse.json(liveReadiness(fund))
}
