import { NextResponse } from "next/server"
import { getAssetUniverse } from "@/lib/assets/keeta-assets"
import { getApiUser } from "@/lib/auth"

export async function GET() {
  if (!(await getApiUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const assets = await getAssetUniverse()
  return NextResponse.json({ assets, source: assets.length > 4 ? "keespecs+curated" : "curated" })
}
