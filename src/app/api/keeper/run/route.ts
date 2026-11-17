import { NextResponse } from "next/server"
import { store } from "@/lib/db/schema"
import { scanVaultDeposits, payWithdrawal, keeperConfigured } from "@/lib/keeta/vault"

/* Keeper loop. Protected by a shared secret; wire to Vercel Cron or an external
   scheduler. Verifies on-chain deposits and pays timelocked withdrawals. */

const TIMELOCK_MS = 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  const secret = process.env.KEEPER_SECRET
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get("x-keeper-secret")
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const authorized =
    Boolean(secret && headerSecret === secret) ||
    Boolean(cronSecret && bearer === cronSecret)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!keeperConfigured()) {
    return NextResponse.json({ error: "Keeper signer not configured" }, { status: 400 })
  }

  const [funds, users, allocations, withdrawals] = await Promise.all([
    store.funds.list(),
    store.users.list(),
    store.allocations.list(),
    store.withdrawals.list(),
  ])
  const result = { depositsCredited: 0, withdrawalsPaid: 0, errors: [] as string[] }

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
  }

  return NextResponse.json({ ok: true, ...result })
}
