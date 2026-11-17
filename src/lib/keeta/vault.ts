/* --------------------------------------------------------------------------
   SurfDAO.ai — Keeta storage-account vault (server only, lazy native import)

   Model (researched from docs.keeta.com):
   - The PLATFORM keeper owns the STORAGE account, not the fund creator. This is
     the key rug-pull protection: the creator is never granted OWNER or
     SEND_ON_BEHALF, so they cannot withdraw allocator funds.
   - defaultPermission = STORAGE_DEPOSIT (anyone may deposit)
   - STORAGE_CAN_HOLD is granted for USDC only (single-token vault)
   - The keeper records on-chain RECEIVE events and credits allocations after
     matching the sender to a SurfDAO profile's Keeta address.
   - Withdrawals are requested by allocators, timelocked, and paid by the keeper.

   IMPORTANT: this is custodial. Storage accounts do not enforce immutable
   withdrawal rules on-chain; users trust the keeper's published policy.
--------------------------------------------------------------------------- */

import { USDC_TOKEN } from "@/lib/assets/keeta-assets"

type KeetaModule = typeof import("@keetanetwork/keetanet-client")
let _keeta: KeetaModule | null = null
async function keeta(): Promise<KeetaModule> {
  if (!_keeta) _keeta = await import("@keetanetwork/keetanet-client")
  return _keeta
}

let cachedClient: any = null

export function keeperConfigured(): boolean {
  return Boolean(process.env.KEETA_KEEPER_SEED)
}

async function keeperClient(): Promise<any> {
  if (cachedClient) return cachedClient
  const seed = process.env.KEETA_KEEPER_SEED
  if (!seed) throw new Error("KEETA_KEEPER_SEED is not configured")
  const K = await keeta()
  const account = (K.lib.Account as any).fromSeed(seed, 0)
  cachedClient = (K as any).UserClient.fromNetwork(process.env.KEETA_NETWORK || "test", account)
  return cachedClient
}

export async function keeperAddress(): Promise<string | null> {
  try {
    const seed = process.env.KEETA_KEEPER_SEED
    if (!seed) return null
    const K = await keeta()
    return (K.lib.Account as any).fromSeed(seed, 0).publicKeyString.get()
  } catch {
    return null
  }
}

/* Create a single-token (USDC) deposit vault owned by the platform keeper. */
export async function createFundVault(fundName: string): Promise<string> {
  const client = await keeperClient()
  const K = await keeta()
  const builder = client.initBuilder()
  const pending = await builder.generateIdentifier(
    (K.lib.Account as any).AccountKeyAlgorithm.STORAGE,
  )
  await builder.computeBlocks()
  const storage = pending.account

  builder.setInfo(
    {
      name: `SurfDAO ${fundName}`.slice(0, 64),
      description: "Deposit-only fund vault. Withdrawals paid by SurfDAO keeper.",
      metadata: "",
      defaultPermission: new (K.lib as any).Permissions(["STORAGE_DEPOSIT"]),
    },
    { account: storage },
  )
  builder.updatePermissions(
    (K.lib.Account as any).fromPublicKeyString(USDC_TOKEN),
    new (K.lib as any).Permissions(["STORAGE_CAN_HOLD"]),
    undefined,
    (K.lib.Block as any).AdjustMethod.ADD,
    { account: storage },
  )
  await client.publishBuilder(builder)
  return storage.publicKeyString.get()
}

export type VaultBalance = { token: string; amount: number }

export async function getVaultBalances(address: string): Promise<VaultBalance[]> {
  if (!keeperConfigured() || !/^keeta_/.test(address)) return []
  try {
    const client = await keeperClient()
    const rows = await client.allBalances({ account: address })
    return (rows || []).map((b: any) => ({
      token: typeof b.token === "string" ? b.token : b.token?.publicKeyString?.get?.() ?? "",
      amount: Number(b.balance ?? 0) / Math.pow(10, Number(b.decimals ?? 6)),
    }))
  } catch (e) {
    console.error("[vault] balances failed:", e)
    return []
  }
}

export type VaultDeposit = { hash: string; date: string; sender: string; amount: number }

export async function scanVaultDeposits(address: string, since: string): Promise<VaultDeposit[]> {
  if (!keeperConfigured() || !/^keeta_/.test(address)) return []
  try {
    const client = await keeperClient()
    const K = await keeta()
    const chain = await client.getChain(address, { depth: 100 })
    const sinceMs = new Date(since).getTime()
    const out: VaultDeposit[] = []
    for (const block of chain || []) {
      const date = (block as any).date
      if (!date || new Date(date).getTime() <= sinceMs) continue
      for (const op of (block as any).operations || []) {
        const type = (K.lib.Block as any).OperationType?.[op.type] ?? String(op.type)
        if (type !== "RECEIVE") continue
        const token = typeof op.token === "string" ? op.token : op.token?.publicKeyString?.get?.() ?? ""
        if (token !== USDC_TOKEN) continue
        const sender = typeof (op as any).from === "string"
          ? (op as any).from
          : (op as any).from?.publicKeyString?.get?.() ?? ""
        out.push({ hash: (block as any).$hash ?? "", date, sender, amount: Number(BigInt(op.amount ?? 0)) / 1e6 })
      }
    }
    return out
  } catch (e) {
    console.error("[vault] scan failed:", e)
    return []
  }
}

export async function payWithdrawal(
  vaultAddress: string,
  toAddress: string,
  amountUsdc: number,
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  if (!keeperConfigured()) return { ok: false, error: "Keeper not configured" }
  try {
    const client = await keeperClient()
    const K = await keeta()
    const result = await client.send(
      (K.lib.Account as any).fromPublicKeyString(toAddress),
      BigInt(Math.round(amountUsdc * 1e6)),
      USDC_TOKEN,
      undefined,
      { account: (K.lib.Account as any).fromPublicKeyString(vaultAddress) },
    )
    const hash = result?.hashes?.[0] ?? result?.hash ?? "unknown"
    return { ok: true, txHash: String(hash) }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) }
  }
}

export function explorerUrl(address: string): string {
  const network = process.env.KEETA_NETWORK || "test"
  return `https://keetascan.io/${network}/account/${encodeURIComponent(address)}`
}
