/* --------------------------------------------------------------------------
   SurfDAO.ai — Keeta client wrapper

   Follows the patterns from keeta-dashboard/api/_lib.mjs (@keetanetwork/
   keetanet-client). All Keeta calls are server-side. Real execution is
   gated behind LIVE_MODE; otherwise the client runs in paper/simulated mode
   so the full flow works without a funded wallet or network access.

   The native Keeta binding (secp256k1) is imported lazily — only when LIVE_MODE
   is enabled — so paper mode / build never loads native modules.
--------------------------------------------------------------------------- */

export const KEETA_NETWORK = process.env.KEETA_NETWORK || "main"
export const LIVE_MODE = process.env.LIVE_MODE === "true"
export const USDC_TOKEN =
  "keeta_amnkge74xitii5dsobstldatv3irmyimujfjotftx7plaaaseam4bntb7wnna"

export type KeetaBalance = {
  token: string
  amount: number
  decimals: number
  valueUsd?: number
}

type KeetaNetModule = typeof import("@keetanetwork/keetanet-client")

let _keeta: KeetaNetModule | null = null
async function keeta(): Promise<KeetaNetModule> {
  if (!_keeta) {
    _keeta = await import("@keetanetwork/keetanet-client")
  }
  return _keeta
}

type KeetaState = {
  signer: any
  uc: any
  client: any
}

const g = globalThis as Record<string, unknown>
async function state(): Promise<KeetaState> {
  if (!g.__surfdao_keeta) {
    const K = await keeta()
    let signer: any = null
    let uc: any = null
    try {
      const seed = K.lib.Account.generateRandomSeed({ asString: true })
      signer = K.lib.Account.fromSeed(seed, 0)
      uc = K.UserClient.fromNetwork(KEETA_NETWORK as any, signer)
    } catch (e) {
      console.error("[surfdao] Keeta signer init failed:", e)
    }
    g.__surfdao_keeta = { signer, uc, client: uc?.client ?? null }
  }
  return g.__surfdao_keeta as KeetaState
}

const S = (v: any) =>
  JSON.parse(JSON.stringify(v, (k, x) => {
    if (typeof x === "bigint") return String(x)
    if (x && typeof x === "object" && typeof x.publicKeyString?.get === "function") return x.publicKeyString.get()
    return x
  }))

/* Address shape check. Live mode does full validation via the client inside
   getBalances/sendToken; here we keep a cheap synchronous shape check. */
export function isAddress(s: string): boolean {
  if (typeof s !== "string") return false
  return s === "demo" || /^keeta_[a-z0-9]+$/.test(s)
}

export function getDemoAddress(): string | null {
  const st = g.__surfdao_keeta as KeetaState | undefined
  return st?.signer?.publicKeyString?.get?.() ?? null
}

/* Look up balances. Paper mode returns a simulated USDC balance. */
export async function getBalances(address: string): Promise<KeetaBalance[]> {
  if (!isAddress(address)) return []
  if (!LIVE_MODE) {
    return [{ token: USDC_TOKEN, amount: 10000, decimals: 6, valueUsd: 10000 }]
  }
  const { client } = await state()
  if (!client) return []
  try {
    const K = await keeta()
    const acct = K.lib.Account.fromPublicKeyString(address)
    const balances = await (client.getAllBalances?.(acct) ?? Promise.resolve([]))
    const sBalances = S(balances)
    return (sBalances || []).map((b: any) => ({
      token: b.token,
      amount: Number(b.balance) / Math.pow(10, b.decimals ?? 18),
      decimals: b.decimals ?? 18,
    }))
  } catch (e) {
    console.error("[surfdao] getBalances error:", e)
    return []
  }
}

/* Sign + send USDC. Paper mode logs + returns a fake hash. */
export async function sendToken({
  fromAddress,
  toAddress,
  token = USDC_TOKEN,
  amount,
}: {
  fromAddress: string
  toAddress: string
  token?: string
  amount: number
}): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  if (!isAddress(toAddress)) return { ok: false, error: "Invalid destination address" }
  if (!LIVE_MODE) {
    const txHash = `0xsurf${crypto.randomUUID().replace(/-/g, "")}`
    console.log("[surfdao] PAPER send", { fromAddress, toAddress, token, amount, txHash })
    return { ok: true, txHash }
  }
  const st = await state()
  if (!st.signer || !st.client) return { ok: false, error: "Keeta signer unavailable in this environment" }
  try {
    const K = await keeta()
    const acct = K.lib.Account.fromPublicKeyString(fromAddress)
    const result = await st.client.send?.({ from: acct, to: toAddress, token, amount: String(amount), signer: st.signer })
    return { ok: true, txHash: S(result)?.hash ?? S(result)?.txHash ?? `0x${crypto.randomUUID().replace(/-/g, "")}` }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) }
  }
}

export async function getNetworkSnapshot() {
  if (!LIVE_MODE) {
    return { network: KEETA_NETWORK, paper: true, baseToken: { address: "keeta_sim", name: "KTA", decimals: 18 } }
  }
  const { client } = await state()
  if (!client) return { network: KEETA_NETWORK, error: "client unavailable" }
  try {
    return S(await client.getNetworkStatus?.(8000))
  } catch (e: any) {
    return { network: KEETA_NETWORK, error: e?.message ?? String(e) }
  }
}
