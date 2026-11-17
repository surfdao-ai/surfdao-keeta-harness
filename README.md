# SurfDAO.ai — Keeta Fund Harness

> Experimental paper-trading harness for launching, running, and allocating capital to
> AI-agent hedge funds ("boards") on Keeta mainnet. Built with Next.js 16 App Router,
> Tailwind 4, Drizzle ORM schema, and a distinctive surfboard-themed UI.

---

## ⚠️ Experimental — not financial advice

This is a **paper-trading MVP**. All funds, agent decisions, NAV movements, and allocations
are simulated by default. Users control their own wallets and are responsible for their
allocations. **Do not accept outside capital without proper licensing.** Live Keeta
execution is gated behind `LIVE_MODE=true` and is unsafe without a properly provisioned,
funded wallet and audited vault contracts.

---

## What's implemented

1. **Surfboard-themed UI** — ocean palette, wave backgrounds, surfboard-shaped cards,
   surf-themed leaderboard ranks (Barrel / Clean Face / Closeout), allocation "Drop in" modal.
2. **Multi-tenant fund creation** ("Shape your board") — name, description, agent crew with
   weights, risk parameters, inference endpoint, optional Keeta wallet address.
3. **Agent orchestrator** (`lib/agents/`) — eight strategy-style prompt templates
   (Deep Value, Intrinsic Value, Quality Moat, Cash Flow Activist, Disruptive Growth,
   Contrarian Value, Risk Manager, Portfolio Manager) with a
   deterministic paper simulator and a pluggable live-inference endpoint.
4. **KeeSpecs / x402 safety flow** (`lib/keespecs/`) — free health check then paid-style
   status / token / convert checks with short-TTL caching, surfaced as
   "Wave conditions: clear / caution / hold". Real x402 gateway configurable via env vars.
5. **Paper advance loop** — run a session, synthesize agent votes, run KeeSpecs checks,
   compute NAV, and log the session. Visible on the fund detail page.
6. **Public leaderboard** — composite ranking from return, consistency, and AUM growth.
7. **Allocation flow** — any signed-in user can allocate USDC into a public fund; KeeSpecs
   checks run first, and on-chain settlement is gated behind `LIVE_MODE`.
8. **Zero-config auth & data** — cookie sessions and a JSON file store so the app runs
   immediately on Vercel preview without external services. Clear swap-in paths to Clerk
   and Neon/Postgres.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Sign in (any email — dev auth creates the account).
- Shape a board at `/dashboard/funds/new`.
- Run an "advance" on the fund detail page.
- View the public leaderboard at `/dashboard/leaderboard`.
- Allocate to another fund at `/dashboard/allocate`.

No env vars are required for paper mode.

---

## Environment variables

Copy `.env.example` to `.env.local` to customize. **None are required for paper mode.**

| Variable | Purpose | Default |
| --- | --- | --- |
| `LIVE_MODE` | Enable real Keeta sends (unsafe — needs funded wallet) | `false` |
| `KEETA_NETWORK` | Keeta network | `main` |
| `X402_GATEWAY` | KeeSpecs x402 gateway base URL | (simulated) |
| `X402_TOKEN` | Paid x402 access token | (simulated) |
| `DATABASE_URL` | Neon/Postgres connection for production store | (JSON file) |

The Keeta mainnet USDC token used is:
`keeta_amnkge74xitii5dsobstldatv3irmyimujfjotftx7plaaaseam4bntb7wnna`

---

## Architecture

```
app/
  (marketing)/page.tsx          Landing page
  (dashboard)/                  Protected shell + dashboard, funds, leaderboard, allocate
  api/
    auth/                       Dev signup/login/logout
    funds/                      Fund CRUD, run advance
    allocations/                Allocation + KeeSpecs check
    leaderboard/                Composite ranking
    x402-health/                Free KeeSpecs health endpoint
lib/
  agents/personas.ts            Investor-persona prompt templates
  agents/orchestrator.ts        Vote aggregation + paper simulator
  keeta/client.ts               Keeta client wrapper (lazy native loading)
  keespecs/client.ts            x402 safety checks + caching
  db/schema.ts                  Drizzle schema + JSON file store
  auth.ts                       Cookie session helpers
components/                     Surf-themed UI components
```

### Path to production

- **Auth**: replace `lib/auth.ts` with Clerk (`clerkMiddleware`, `auth()`, `SignInButton`).
- **Database**: the Drizzle tables in `lib/db/schema.ts` are production-ready; point them at
  Neon via `DATABASE_URL` and swap `store` calls for Drizzle queries. Note the MVP JSON store
  writes to `src/data`, so use a persistent volume or migrate before a production deploy.
- **Live execution**: set `LIVE_MODE=true`, fund a wallet, and replace the simulated NAV
  update in `/api/funds/[slug]/advance` with real Keeta transactions against an audited vault.

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel
```

Paper mode needs no environment variables. Native Keeta bindings are externalized in
`next.config.ts` so builds don't bundle them.

**Live deployment:** [https://surfdao.vercel.app](https://surfdao.vercel.app) (deployment
protection enabled — ask the owner for access). Source:
[github.com/surfdao-ai/surfdao-keeta-harness](https://github.com/surfdao-ai/surfdao-keeta-harness).

> Note: the zero-config store falls back to an in-memory map on Vercel's read-only
> filesystem. Newly created funds, sessions, and allocations are also mirrored into an
> httpOnly cookie so the creator's own flows work reliably across lambda instances.
> Data is still per-browser and ephemeral — use Drizzle + Neon for durable, shared data.

---

## Verification

```bash
npx tsc --noEmit     # type check
npm run build        # production build
```

---

*SurfDAO.ai — ride the wave, respect the risk.*
