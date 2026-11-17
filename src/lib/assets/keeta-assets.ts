/* --------------------------------------------------------------------------
   SurfDAO.ai — Keeta asset universe

   Curated mainnet assets + live discovery from the KeeSpecs public directory.
   All calls are server-side and cached. Falls back to the curated list when
   the registry is unavailable so fund creation never blocks.
--------------------------------------------------------------------------- */

export type KeetaAsset = {
  symbol: string
  name: string
  address: string | null
  decimals: number
  kind: "stablecoin" | "asset" | "fiat"
  color: string
  priceUsd: number
}

const KEEPSPECS = "https://keespecs.xyz"
export const USDC_TOKEN =
  "keeta_amnkge74xitii5dsobstldatv3irmyimujfjotftx7plaaaseam4bntb7wnna"
export const EURC_TOKEN =
  "keeta_apblhar4ncp3ln62wrygsn73pt3houuvj7ic47aarnolpcu67oqn4xqcji3au"
export const EUR_TOKEN =
  "keeta_anutgo4o3yp5tvc6wjt4vzsehjbn7t2wylpxmam4d4ojtdkjj2yca2qoinfcs"

export const CURATED_ASSETS: KeetaAsset[] = [
  { symbol: "USDC", name: "USD Coin", address: USDC_TOKEN, decimals: 6, kind: "stablecoin", color: "#2775CA", priceUsd: 1 },
  { symbol: "KTA", name: "Keeta", address: null, decimals: 18, kind: "asset", color: "#3B82F6", priceUsd: 1.24 },
  { symbol: "EURC", name: "Euro Coin", address: EURC_TOKEN, decimals: 6, kind: "stablecoin", color: "#4285F4", priceUsd: 1.08 },
  { symbol: "EUR", name: "Euro Token", address: EUR_TOKEN, decimals: 6, kind: "fiat", color: "#2DD4BF", priceUsd: 1.08 },
]

const COLORS = ["#8B5A2B", "#FF6B35", "#A855F7", "#14B8A6", "#EAB308", "#EC4899", "#64748B"]
const TTL = 60 * 60 * 1000
let cache: { at: number; assets: KeetaAsset[] } | null = null

type RegistryRow = { code?: string; name?: string; token?: string; currency?: string; decimals?: number; kind?: string }

async function fetchRegistry(path: string): Promise<RegistryRow[]> {
  const res = await fetch(`${KEEPSPECS}${path}`, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`keespecs ${path} ${res.status}`)
  const json: any = await res.json()
  return json.coins ?? json.tokens ?? json.assets ?? []
}

function seededPrice(symbol: string): number {
  let h = 0
  for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) | 0
  return 0.5 + (Math.abs(h) % 1000) / 100
}

export async function getAssetUniverse(): Promise<KeetaAsset[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.assets
  let assets = [...CURATED_ASSETS]
  try {
    const [stables, directory, supply] = await Promise.all([
      fetchRegistry("/api/stablecoins").catch(() => []),
      fetchRegistry("/api/directory").catch(() => []),
      fetchRegistry("/api/supply").catch(() => []),
    ])
    const seen = new Set(assets.map((a) => a.symbol.toUpperCase()))
    for (const row of [...stables, ...directory, ...supply]) {
      const symbol = String(row.code ?? row.currency ?? "").toUpperCase().slice(0, 8)
      if (!symbol || !row.token || seen.has(symbol)) continue
      seen.add(symbol)
      assets.push({
        symbol,
        name: String(row.name ?? symbol),
        address: String(row.token),
        decimals: Number(row.decimals ?? 18),
        kind: row.kind === "stablecoin" ? "stablecoin" : "asset",
        color: COLORS[assets.length % COLORS.length],
        priceUsd: seededPrice(symbol),
      })
      if (assets.length >= 24) break
    }
  } catch {
    // curated fallback is enough for paper mode
  }
  cache = { at: Date.now(), assets }
  return assets
}

export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const universe = await getAssetUniverse()
  const out: Record<string, number> = {}
  for (const s of symbols) {
    const asset = universe.find((a) => a.symbol.toUpperCase() === s.toUpperCase())
    out[s] = asset?.priceUsd ?? seededPrice(s)
  }
  return out
}

export function assetColor(symbol: string): string {
  return getAssetUniverseSync().find((a) => a.symbol === symbol)?.color ?? "#64748B"
}

function getAssetUniverseSync(): KeetaAsset[] {
  return cache?.assets ?? CURATED_ASSETS
}
