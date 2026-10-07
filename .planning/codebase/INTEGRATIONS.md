---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# External Integrations

**Analysis Date:** 2026-10-08

## APIs & External Services

**Commerce API (primary):**
- Medusa Store / Auth / Admin HTTP APIs — All storefront data and customer auth
  - SDK/Client: `@medusajs/js-sdk` via `sdk` in `apps/storefront/src/lib/config.ts`
  - Auth: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (publishable key header); customer JWT via `Authorization: Bearer` from cookie `_medusa_jwt`
  - Base URL: `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (default `http://localhost:9000`)
  - Extra header: `x-medusa-locale` injected on every SDK fetch (`apps/storefront/src/lib/config.ts`)

**Payments:**
- Stripe (Elements) — Card / Stripe-like checkout UI
  - SDK/Client: `@stripe/stripe-js`, `@stripe/react-stripe-js`
  - Auth: `NEXT_PUBLIC_STRIPE_KEY` or `NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`
  - Optional Connect account: `NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID` (`apps/storefront/src/modules/checkout/components/payment-wrapper/index.tsx`)
  - Provider IDs recognized in UI: `pp_stripe_*`, `pp_medusa-*` (`apps/storefront/src/lib/constants.tsx` `isStripeLike`)
- Medusa Payments — Treated as Stripe-like (`pp_medusa-payments_default`)
- PayPal — UI mapping only (`pp_paypal_paypal` in `paymentInfoMap`); no PayPal SDK package in storefront
- Manual / system payment — Seeded default `pp_system_default` in `apps/backend/src/migration-scripts/initial-data-seed.ts`

**Search:**
- Medusa product search index — Backend defines product index in `apps/backend/src/search/product.ts` (`defineSearchIndex` / `@medusajs/framework` search utils)
- InstantSearch adapter — Storefront queries Medusa `POST/GET` style search via `/store/search` (`apps/storefront/src/lib/search-client.ts`)
  - SDK/Client: `@medusajs/instantsearch-adapter` + `react-instantsearch`
  - Auth: same Medusa publishable key / SDK session as other store calls
  - Indexed price currencies: `eur`, `usd` (keep in sync with backend `PRICE_CURRENCIES`)

**Media / CDN:**
- AWS S3 / Medusa Cloud S3 — Remote image host patterns in `apps/storefront/next.config.js`
  - Auth: public HTTPS image URLs; optional `MEDUSA_CLOUD_S3_HOSTNAME` + `MEDUSA_CLOUD_S3_PATHNAME`

## Data Storage

**Databases:**
- PostgreSQL 15+
  - Connection: `DATABASE_URL` (also `DB_NAME` placeholder in `apps/backend/.env.template`)
  - Client: Medusa framework ORM / module services (no direct Prisma/Drizzle in app code)
  - Config entry: `projectConfig.databaseUrl` in `apps/backend/medusa-config.ts`

**File Storage:**
- Local/default Medusa file module in starter config (no custom file-provider module under `apps/backend/src/modules/`)
- Production images expected from S3-compatible hosts (see storefront `images.remotePatterns`)

**Caching:**
- Next.js cache tags — Storefront uses `_medusa_cache_id` cookie + `revalidateTag` (`apps/storefront/src/lib/data/cookies.ts`)
- Redis — `REDIS_URL` documented in `apps/backend/.env.template`; not referenced in current `medusa-config.ts`
- Package `@medusajs/caching` present on backend for Medusa caching stack

## Authentication & Identity

**Auth Provider:**
- Medusa Auth module — Customer actor + `emailpass` provider (built-in; no custom auth module under `apps/backend/src/modules/`)

**Storefront customer auth (prescriptive flow):**
1. Register: `sdk.auth.register("customer", "emailpass", { email, password })` in `apps/storefront/src/lib/data/customer.ts` (`signup`)
2. Login: `sdk.auth.login("customer", "emailpass", { email, password })` (`completeLogin`)
3. Persist JWT in httpOnly cookie `_medusa_jwt` via `setAuthToken` (`apps/storefront/src/lib/data/cookies.ts`); attach with `getAuthHeaders()` on subsequent calls
4. Create/link customer record with `sdk.store.customer.create` / `retrieve` when token has no customer actor yet
5. Email verification (when backend requires it): `sdk.auth.verification.request` + `sdk.auth.verification.confirm`; UI at `apps/storefront/src/app/[countryCode]/(main)/verify-account/page.tsx` and account login/register components
6. Pending signup profile fields stored in `_medusa_pending_customer` cookie until post-verify login
7. Logout: `sdk.auth.logout()` + clear cookies
8. Third-party / OAuth redirects (`location` on login result) — Explicitly rejected by storefront (“isn't supported”)

**Admin identity:**
- Medusa Admin users via `pnpm medusa user` (documented in `README.md`); admin CORS via `ADMIN_CORS` / `AUTH_CORS`

**Secrets:**
- `JWT_SECRET`, `COOKIE_SECRET` — Backend HTTP auth/cookie signing (`apps/backend/medusa-config.ts`)

**Not detected:**
- Better Auth, Clerk, Auth.js, Supabase Auth, NextAuth — Not used in application code
- Social OAuth providers — Not implemented in storefront login

## Monitoring & Observability

**Error Tracking:**
- None active

**Logs:**
- Medusa logger in seed/scripts (e.g. `apps/backend/src/migration-scripts/initial-data-seed.ts`)
- Next.js fetch logging enabled (`logging.fetches.fullUrl` in `apps/storefront/next.config.js`)
- OpenTelemetry / Zipkin stub commented out in `apps/backend/instrumentation.ts` — Not registered

## CI/CD & Deployment

**Hosting:**
- Medusa Cloud — Primary documented deploy path (`README.md`)
- Storefront — Next.js host; Vercel-oriented env (`NEXT_PUBLIC_VERCEL_URL` in `apps/storefront/next-sitemap.js`)

**CI Pipeline:**
- None in-repo (no project-level `.github/workflows` detected)

**Local orchestration:**
- `pnpm dev` / Turbo filters `backend:dev`, `storefront:dev` from root `package.json`

## Environment Configuration

**Required env vars:**

Backend (`apps/backend/.env` from `.env.template`):
- `DATABASE_URL`
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
- `JWT_SECRET`, `COOKIE_SECRET`
- `REDIS_URL` (template; optional until wired)
- `DB_NAME` (template placeholder)

Storefront (`apps/storefront/.env.local` per `README.md`):
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (hard-required by `check-env-variables.js`)
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- `NEXT_PUBLIC_DEFAULT_REGION`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_STRIPE_KEY` and/or `NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID` (optional Connect)
- `MEDUSA_CLOUD_S3_HOSTNAME`, `MEDUSA_CLOUD_S3_PATHNAME` (optional images)
- `NEXT_PUBLIC_VERCEL_URL` (optional sitemap)

**Secrets location:**
- Local: gitignored `.env` / `.env.local` under apps (never commit)
- Templates only: `apps/backend/.env.template`
- Production: Medusa Cloud / host secret store (document keys in templates/README, not values)

## Webhooks & Callbacks

**Incoming:**
- None custom under `apps/backend/src/api/` (only placeholder `apps/backend/src/api/store/custom/route.ts` and `apps/backend/src/api/admin/custom/route.ts`)
- Stripe / payment provider webhooks — Handled by Medusa payment modules when configured in Admin; no app-owned webhook route files detected

**Outgoing:**
- Storefront → Medusa Store/Auth APIs (server actions and SDK)
- Stripe.js → Stripe API for payment confirmation (`apps/storefront/src/modules/checkout/components/payment-button/index.tsx`)
- Email verification delivery — Triggered via Medusa `sdk.auth.verification.request` (provider configured on Medusa backend / Admin; no Resend/SendGrid package in this repo)

**Auth-related cookies (storefront):**
- `_medusa_jwt` — Customer bearer token (httpOnly, `sameSite: "lax"`)
- `_medusa_pending_customer` — Pre-verify signup fields
- `_medusa_cache_id` — Cache tag scoping
- Cart / locale cookies — Cart id and `_medusa_locale` (`apps/storefront/src/lib/data/cookies.ts`, `locale-actions.ts`)

---

*Integration audit: 2026-10-08*
