import { NextResponse } from "next/server"
import { getAssetUniverseDetailed } from "@/lib/assets/keeta-assets"
import { getApiUser } from "@/lib/auth"

export async function GET(req: Request) {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const force = new URL(req.url).searchParams.get("refresh") === "true"
  const result = await getAssetUniverseDetailed(force)
  return NextResponse.json(result)
}
