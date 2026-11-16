/* --------------------------------------------------------------------------
   SurfDAO.ai — GET /api/x402-health (free)
   Per spec: free health check before any paid KeeSpecs call.
--------------------------------------------------------------------------- */

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "keespecs/x402",
    live: process.env.LIVE_MODE === "true",
    asOf: new Date().toISOString(),
  })
}
