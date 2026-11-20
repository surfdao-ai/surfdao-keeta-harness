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
8. **Zero-config auth & data** — email + password auth (scrypt hashing) with cookie
   sessions, a rich editable surfer profile, and a JSON file store so the app runs
   immediately on Vercel preview without external services. Clear swap-in paths to Clerk
   and Neon/Postgres.
9. **Inference selector** — chooses the LLM provider used for agent reasoning only. Live
   Keeta mainnet execution is never enabled by this dropdown; it requires `LIVE_MODE=true`,
   a funded wallet, and an audited vault.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Create an account with email + password (min 8 characters), or sign in to an existing one.
- Shape a board at `/dashboard/funds/new` (also reachable from the flag icon in the sidebar).
- Build a rich surfer profile by clicking your avatar at the bottom of the sidebar.
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
| `DATABASE_URL` | Neon/Postgres connection — **provisioned and connected via Vercel Marketplace** | (JSON file fallback) |
| `COOKIE_SECRET` | HMAC secret for signed cookies (set in production) | dev fallback |
| `INFERENCE_SECRET` | AES-GCM secret for user API keys (set in production) | `COOKIE_SECRET` |

The Keeta mainnet USDC token used is:
`keeta_amnkge74xitii5dsobstldatv3irmyimujfjotftx7plaaaseam4bntb7wnna`

## How to initiate LIVE mode (real Keeta mainnet execution)

Live mode is **off by default and intentionally gated**. The agent inference
dropdown in the fund wizard only chooses the LLM used for reasoning — it never
enables live trading. To actually send real value:

1. **Set the environment variable** on the server that runs the app:
   ```bash
   # Vercel
   vercel env add LIVE_MODE production   # value: true

   # Local / self-hosted (.env.local)
   LIVE_MODE=true
   ```
   Also set a strong `COOKIE_SECRET` (Vercel: `vercel env add COOKIE_SECRET production`).

2. **Fund a Keeta wallet** and set each fund's `keetaWalletAddress` to an address
   you control. The server-side Keeta client signs sends with its own runtime
   signer in this MVP — replace `lib/keeta/client.ts` `sendToken()` with
   user-authorized signing (e.g. WalletConnect / Anchor) before holding real funds.

3. **Deploy and audit an on-chain vault/contract.** Fund-specific deposit
   addresses should be vault accounts with owner-controlled ACLs, not arbitrary
   wallet addresses. KeeSpecs x402 checks should be configured with a real
   `X402_GATEWAY` + `X402_TOKEN`.

4. **Swap the simulated NAV engine.** In
   `app/api/funds/[slug]/advance/route.ts`, replace the score-derived NAV change
   with real execution results, then persist via Drizzle + Neon (`DATABASE_URL`)
   instead of the JSON/cookie store.

5. **Redeploy** (`vercel --prod`) and confirm the dashboard banner reads **LIVE**.

> ⚠️ Until steps 2–5 are done, do not enable `LIVE_MODE`. Enabling the flag alone
> does not make the current MVP safe for real capital — it only switches the
> client from simulated `txHash` values to real `sendToken()` calls.

---

## Fund manager workflow (end to end)

1. **Create the harness** — **Identity** (name, description, optional Keeta wallet) →
   **Agents** (strategy-style crew, weights capped at 100%) → **Assets** (pick from the
   live Keeta/KeeSpecs universe — USDC, KTA, EURC, fiat-backed tokens, CBBTC — with weights
   capped at 100%) → **Harness** (risk limits + inference provider) → **Publish**.
2. **Bring your own inference (any provider)** — enter any provider label (OpenRouter,
   xAI/Grok, Groq, Together, DeepSeek, Mistral, Anthropic, or your own) plus a public https
   endpoint, key, and model. OpenAI-compatible endpoints use chat/completions; Anthropic uses
   the Messages API; other labels work through the same generic adapter.
   API key, and model. The endpoint is SSRF-checked (https + public hosts only) and the key
   is AES-256-GCM encrypted server-side; keys are never returned to the browser. If the
   external call fails, the harness falls back to the deterministic paper simulator so the
   loop never breaks. **Creators can switch provider/model/endpoint later** from the fund
   page's "Harness settings" panel (owner only); leaving the key blank keeps the existing
   encrypted key, and switching back to Simulated clears it.
3. **Publish or keep as draft** — drafts are hidden from the public leaderboard and from
   allocations. The owner can Publish/Unpublish any time from the fund page; visibility is
   also patchable via `PATCH /api/funds/[slug]`.
4. **Run advances** — each paper session builds a market snapshot from the fund's own assets,
   runs the agent crew, produces target weights per asset, runs KeeSpecs checks, and logs
   NAV + theses + holdings. The fund page shows the asset universe, target weights, performance
   wave, thesis feed, and recent sessions.
5. **Allocate** — published funds appear on the leaderboard and in Allocate; any signed-in
   user can drop in USDC. Allocations appear on the fund page and in the allocator's profile.
6. **Profile** — review funds created, allocations made, and session history; edit profile.

Asset discovery lives in `lib/assets/keeta-assets.ts` (`GET /api/assets`), with a curated
fallback when KeeSpecs is unreachable. The registry is **auto-synced every 5 minutes** on
demand (short TTL), and the fund wizard shows the last-sync time, total asset count, and a
**"Check for new assets"** button that forces a fresh registry fetch (`?refresh=true`).
Newly discovered symbols are flagged with a `NEW` badge. The cap is 100 assets so new
listings aren't dropped.

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

## On-chain vault model (researched from docs.keeta.com)

Keeta has no smart contracts, so fund custody uses **storage accounts + ACL permissions**,
not code-enforced vault logic. The implemented model (`lib/keeta/vault.ts`):

- **Vault creation** — the platform keeper (server signer from `KEETA_KEEPER_SEED`) creates a
  `STORAGE` account per fund. Default permission is `STORAGE_DEPOSIT` (anyone can deposit);
  `STORAGE_CAN_HOLD` is granted **only for the Keeta USDC token** (single-token vault).
- **Custody model A/D (chosen)** — the **keeper owns the storage account and holds all
  principal**; the fund creator is never given OWNER or SEND_ON_BEHALF and cannot withdraw
  allocator funds. Instead, the creator earns a configurable **performance fee on gains only**
  (default 10%, max 30%), accrued each profitable session and paid by the keeper to the
  creator's **own Keeta wallet** after a 7-day timelock. Paper mode tracks fees as `pending`;
  the keeper pays them once live execution is configured.
  Per Keeta docs, a storage owner can still change ACLs later, so this is a policy/custodial
  guarantee, not an immutable on-chain one — disclosed to users in the UI.
- **Allocation verification** — allocators send USDC to the displayed vault address. The keeper
  (`POST /api/keeper/run`, hourly via Vercel Cron) scans the vault chain for `RECEIVE` events,
  matches the sender to a profile's `keetaAddress`, and credits the allocation with the on-chain
  tx hash. The address is linkable to KeetaScan for independent verification.
- **Withdrawals** — allocators request a withdrawal (amount + destination); the keeper pays it
  from the vault after a **24-hour timelock**, then marks matching allocations withdrawn.
- **Access control** — the keeper endpoint requires `KEEPER_SECRET` (header) or Vercel's
  `CRON_SECRET` (Bearer). No private keys are stored in the app; the seed lives only in env.

Required env for live execution: `LIVE_MODE=true`, `KEETA_NETWORK`, `KEETA_KEEPER_SEED`,
`KEEPER_SECRET`, `CRON_SECRET`, `X402_GATEWAY`, `X402_TOKEN`, `DATABASE_URL`.
The UI's per-fund **Live execution** panel shows a real readiness checklist and requires an
explicit risk acknowledgment before enabling live mode. `Enable live` is disabled until every
server-side prerequisite passes.

> This is custodial and experimental. A professionally audited vault and a funded keeper wallet
> are external prerequisites; this code does not claim to provide either.

## Data accuracy

- **NAV** starts at 10,000 + capital allocated since the last session; each advance applies
  the return produced by the fund's own selected assets (stablecoins stay near their peg,
  volatile assets move in a deterministic per-session walk).
- **AUM / allocators** are derived live from non-withdrawn allocations; distinct allocator
  counts are unique users, not allocation rows.
- **Total return** is compounded from stored per-session returns, so a new allocation never
  appears as "performance". Fund cards, leaderboard, dashboard, and profile all use the same
  `fundStats()` helper.
- **Performance wave** plots only real stored NAV points — no synthetic data when a fund has
  no sessions. All session lists are sorted newest-first at the store level.
- Sessions appear on the dashboard (recent) and in Profile → Activity, with NAV and return.

The in-app **Execution mode** banner links to `/dashboard/live-mode`, a dedicated page that
explains paper vs live and the five steps to enable real execution.

## Production hardening pass (2026-11-20)

**Auth & access control**
 - **Auth gate on `/dashboard/*`**: anonymous visitors are redirected to
   `/login` (server component in `src/app/(dashboard)/layout.tsx`), so no
   authenticated page renders without a session. API routes independently
   return 401.
 - **Data-leak fix**: `/api/funds` now returns *only* the caller's own funds
   plus published funds (previously it enumerated every fund, including other
   users' private drafts, to any signed-in account). Private fund pages and
   their API routes 404 for non-owners.
 - Login responses are uniform ("Invalid email or password") — no user
   enumeration — and a per-account rate limit (8/10 min) complements the
   per-IP limit. Password scrypt uses OWASP-recommended cost (N=16384, r=8,
   p=1) with uniform timing on malformed hashes.
 - Keeper endpoint uses a **timing-safe** secret comparison plus a 20/min
   brute-force guard; fund advances are rate-limited per user (10/min).

**Transport / response hardening**
 - `next.config.ts` sets security headers on every response: Content-Security-Policy,
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
   `Referrer-Policy`, `Permissions-Policy`, and `poweredByHeader: false`.
 - **CSP note**: `script-src` must include `'unsafe-inline'` because the Next.js
   App Router ships its RSC/flight payload as inline `<script>` tags. A
   `'self'`-only policy blocks hydration app-wide (interactive pages go inert)
   — this was a real regression that was fixed in this pass.

**Observability & ops**
 - `GET /api/health` liveness probe (reports DB status; used by Vercel health checks).
 - `vercel.json` schedules the keeper hourly: `0 * * * *` → `POST /api/keeper/run`
   (no-ops until `KEETA_KEEPER_SEED` is set, since no vaults exist in paper mode).
 - Fund card return label corrected to "all time" (it was an ever-compounded
   figure, not 30d); dashboard "Latest NAV" shows "—" instead of a fabricated
   $10,000 when the user has no sessions.

**UI polish**
 - Landing page: live marketplace strip (boards, AUM, sessions, best return),
   "Top boards this week" preview, custody/fee-model safety section, animated
   hero.
 - New CSS: drifting ocean glow, double wave-stripe, staggered fade-up
   entrances, pulsing live-mode indicator; themed 404 page.

## Security & operational audit (2026-11-17)

**App-level hardening applied**
- Signed cookies (HMAC-SHA256) for every mirrored record — tampering with
  `surfdao_user` / `surfdao_auth` can no longer impersonate another user.
  Set `COOKIE_SECRET` in production (a dev fallback is used otherwise).
- All mutating APIs require an authenticated session, enforce same-origin, and
  validate/limit inputs (name 60 chars, bio 500, amount 0–1,000,000).
- API routes return 401 JSON instead of a redirect (no HTML-in-fetch failures).
- Rate limiting on signup (5/min/IP) and login (10/min/IP).
- SSRF guard on inference endpoints (https + public hosts only; private/loopback
  ranges blocked). The UI only offers known providers and never stores a URL/key.
- `passwordHash` is stripped from all API responses and cookies; logout clears
  every mirrored cookie.
- `npm audit`: 0 critical. 5 high / 16 moderate are transitive advisories pinned
  by the Keeta SDK's bundled shrinkwrap (`@google-cloud/logging` → grpc-js,
  form-data, jws, tmp, lodash) and drizzle-kit (dev only). None are reachable
  from the paper-trading path; npm `overrides` cannot rewrite the SDK's pinned
  tree. Revisit when the SDK ships an updated shrinkwrap.

**Operational notes**
- `npm run build --webpack` + `npx tsc --noEmit` both pass.
- **Neon/Postgres is provisioned and connected** (`surfdao-db` via Vercel Marketplace).
  When `DATABASE_URL` is present, `lib/db/pg-store.ts` is used automatically and all
  tables are created on first request. The JSON/cookie store remains a local fallback.
- Live execution remains disabled unless `LIVE_MODE=true`.

## Verification

```bash
npm test             # 41 Vitest unit tests (money math, validators, crypto, SSRF, readiness, rate limit, fund visibility)
npx tsc --noEmit     # type check
npm run lint         # ESLint
npm run build        # production build
```

Unit tests live in `tests/unit/` and cover the highest-risk logic: fund stats/return
compounding, agent weight normalization, asset price simulation (stablecoin peg),
password/cookie/API-key crypto, SSRF and input validation, and live-mode readiness.

`.github/workflows/ci.yml` runs install → lint → typecheck → tests → build on every push
and PR to `master`/`main`.

---

*SurfDAO.ai — ride the wave, respect the risk.*
