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
  /** true when this symbol first appeared in the most recent registry sync */
  isNew?: boolean
}

export type AssetUniverseResult = {
  assets: KeetaAsset[]
  lastUpdated: string
  source: "keespecs+curated" | "curated"
  newlyListed: string[]
  count: number
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
// Short TTL so new Keeta listings appear on the next fund creation automatically.
const TTL = 5 * 60 * 1000
type AssetCache = { at: number; assets: KeetaAsset[]; source: AssetUniverseResult["source"]; newlyListed: string[] }
let cache: AssetCache | null = null
// In-flight promise so concurrent requests don't double-fetch the registry.
let inFlight: Promise<AssetCache> | null = null

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

async function syncAssets(): Promise<AssetCache> {
  const previous = new Set(cache?.assets.map((a) => a.symbol) ?? [])
  const assets = [...CURATED_ASSETS]
  let source: AssetUniverseResult["source"] = "curated"
  try {
    const [stables, directory, supply] = await Promise.all([
      fetchRegistry("/api/stablecoins").catch(() => []),
      fetchRegistry("/api/directory").catch(() => []),
      fetchRegistry("/api/supply").catch(() => []),
    ])
    if (stables.length + directory.length + supply.length > 0) source = "keespecs+curated"
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
        isNew: cache ? !previous.has(symbol) : false,
      })
      if (assets.length >= 100) break
    }
  } catch {
    // curated fallback is enough for paper mode
  }
  const newlyListed = cache
    ? assets.filter((a) => !previous.has(a.symbol)).map((a) => a.symbol)
    : []
  const result: AssetCache = { at: Date.now(), assets, source, newlyListed }
  cache = result
  return result
}

/** Force a fresh registry check (used by the wizard's Refresh button). */
export async function refreshAssetUniverse(): Promise<AssetCache> {
  inFlight = syncAssets()
  try { return await inFlight } finally { inFlight = null }
}

/** Normal get — auto syncs when cache is older than TTL. */
async function getCached(): Promise<AssetCache> {
  if (cache && Date.now() - cache.at < TTL) return cache
  if (inFlight) return inFlight
  inFlight = syncAssets()
  try { return await inFlight } finally { inFlight = null }
}

export async function getAssetUniverse(): Promise<KeetaAsset[]> {
  return (await getCached()).assets
}

/** Detailed result with sync metadata for the fund-creation UI. */
export async function getAssetUniverseDetailed(force = false): Promise<AssetUniverseResult> {
  const c = force ? await refreshAssetUniverse() : await getCached()
  return {
    assets: c.assets,
    lastUpdated: new Date(c.at).toISOString(),
    source: c.source,
    newlyListed: c.newlyListed,
    count: c.assets.length,
  }
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

export type MarketSnapshot = {
  prices: Record<string, number>
  changes24h: Record<string, number>
  volume: Record<string, number>
  asOf: string
  sessionIndex: number
}

/* Deterministic per-symbol session walk. Each session produces a distinct but
   reproducible move, so stored NAV/return data reflects the fund's own assets. */
export async function getMarketSnapshot(symbols: string[], sessionIndex: number): Promise<MarketSnapshot> {
  const base = await getPrices(symbols)
  const prices: Record<string, number> = {}
  const changes24h: Record<string, number> = {}
  const volume: Record<string, number> = {}
  // Explicit set: a generic 3-letter pattern would wrongly treat KTA as stable.
  const STABLE_SYMBOLS = new Set([
    "USDC", "USDT", "DAI", "EURC", "EUR",
    "AED", "CAD", "CNY", "GBP", "HKD", "JPY", "MXN",
  ])
  symbols.forEach((s, i) => {
    const seed = `${s}:${sessionIndex}:${i}`
    let h = 2166136261
    for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
    const r1 = ((h >>> 0) % 2000) / 1000 - 1          // -1 .. 1
    const r2 = ((Math.abs(h >>> 7) % 2000) / 1000 - 1) // -1 .. 1
    const isStable = STABLE_SYMBOLS.has(s.toUpperCase()) || /^KB[A-Z]+$/.test(s.toUpperCase())
    const raw = r1 * 7 + r2 * 4                        // roughly -11 .. 11
    // Fiat-backed tokens stay within a tight band of their peg.
    const change = Math.round((isStable ? Math.max(-0.4, Math.min(0.4, raw / 20)) : raw) * 100) / 100
    changes24h[s] = change
    prices[s] = Math.round(base[s] * (1 + change / 100) * 1e6) / 1e6
    volume[s] = Math.round(Math.abs(r2) * 5e6 + 5e5)
  })
  return { prices, changes24h, volume, asOf: new Date().toISOString(), sessionIndex }
}

export function assetColor(symbol: string): string {
  return getAssetUniverseSync().find((a) => a.symbol === symbol)?.color ?? "#64748B"
}

function getAssetUniverseSync(): KeetaAsset[] {
  return cache?.assets ?? CURATED_ASSETS
}
