import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { scanVaultDeposits, payWithdrawal, keeperConfigured } from "@/lib/keeta/vault"
import { rateLimit } from "@/lib/rate-limit"

/* Keeper loop. Protected by a shared secret (timing-safe compare); wire to
   Vercel Cron or an external scheduler. Verifies on-chain deposits and pays
   timelocked withdrawals. */

const TIMELOCK_MS = 24 * 60 * 60 * 1000

function secretMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false
  const a = createHmac("sha256", "surfdao-keeper-compare").update(provided).digest()
  const b = createHmac("sha256", "surfdao-keeper-compare").update(expected).digest()
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  // Brute-force guard on the keeper endpoint regardless of auth.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (!rateLimit(`keeper:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  const secret = process.env.KEEPER_SECRET
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get("x-keeper-secret")
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const authorized =
    secretMatch(headerSecret, secret) || secretMatch(bearer, cronSecret)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!keeperConfigured()) {
    return NextResponse.json({ error: "Keeper signer not configured" }, { status: 400 })
  }

  const [funds, users, allocations, withdrawals, fees] = await Promise.all([
    store.funds.list(),
    store.users.list(),
    store.allocations.list(),
    store.withdrawals.list(),
    store.fees.list(),
  ])
  const result = { depositsCredited: 0, withdrawalsPaid: 0, feesPaid: 0, errors: [] as string[] }

  for (const fund of funds) {
    const vault = (fund as any).vaultAddress
    if (!vault) continue

    // 1) Verify new on-chain deposits and credit matching profiles.
    try {
      const deposits = await scanVaultDeposits(vault, fund.createdAt)
      for (const d of deposits) {
        const already = allocations.some((a) => a.keetaTxHash === d.hash)
        if (already) continue
        const user = users.find((u) => u.keetaAddress?.toLowerCase() === d.sender.toLowerCase())
        if (!user || d.amount <= 0) continue
        await store.allocations.create({
          fundId: fund.id,
          allocatorUserId: user.id,
          allocatorName: user.name || user.email,
          amountUsdc: d.amount,
          keetaTxHash: d.hash,
          status: "active",
        })
        result.depositsCredited++
      }
    } catch (e: any) {
      result.errors.push(`scan ${fund.slug}: ${e?.message ?? e}`)
    }

    // 2) Pay withdrawals whose timelock has elapsed.
    for (const w of withdrawals.filter((x) => x.fundId === fund.id && x.status === "pending")) {
      if (Date.now() - new Date(w.requestedAt).getTime() < TIMELOCK_MS) continue
      try {
        const paid = await payWithdrawal(vault, w.keetaAddress, w.amountUsdc)
        if (!paid.ok) {
          result.errors.push(`pay ${w.id}: ${paid.error}`)
          continue
        }
        await store.withdrawals.update(w.id, {
          status: "paid",
          processedAt: new Date().toISOString(),
          txHash: paid.txHash,
        })
        // Mark the matching allocation(s) as withdrawn, newest first.
        let remaining = w.amountUsdc
        const mine = allocations
          .filter((a) => a.fundId === fund.id && a.allocatorUserId === w.userId && a.status !== "withdrawn")
          .sort((a, b) => b.allocatedAt.localeCompare(a.allocatedAt))
        for (const a of mine) {
          if (remaining <= 0) break
          const used = Math.min(remaining, Number(a.amountUsdc))
          await store.allocations.update(a.id, { status: "withdrawn" })
          remaining -= used
        }
        result.withdrawalsPaid++
      } catch (e: any) {
        result.errors.push(`withdraw ${w.id}: ${e?.message ?? e}`)
      }
    }

    // 3) Pay accrued performance fees to creator wallets after a 7-day timelock.
    for (const fee of fees.filter((f) => f.fundId === fund.id && f.status === "pending")) {
      if (Date.now() - new Date(fee.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000) continue
      try {
        const paid = await payWithdrawal(vault, fee.walletAddress, fee.feeUsdc)
        if (!paid.ok) { result.errors.push(`fee ${fee.id}: ${paid.error}`); continue }
        await store.fees.update(fee.id, {
          status: "paid",
          paidAt: new Date().toISOString(),
          txHash: paid.txHash,
        })
        result.feesPaid++
      } catch (e: any) {
        result.errors.push(`fee ${fee.id}: ${e?.message ?? e}`)
      }
    }
  }

  return NextResponse.json({ ok: true, ...result })
}
