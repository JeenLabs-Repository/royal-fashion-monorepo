---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# Technology Stack

**Analysis Date:** 2026-10-08

## Languages

**Primary:**
- TypeScript 5.x — Application code in `apps/backend` (Medusa) and `apps/storefront` (Next.js); backend pins `typescript` `^5.6.2`, storefront pins `^5.3.2`

**Secondary:**
- JavaScript — Config and tooling (`apps/storefront/next.config.js`, `apps/storefront/check-env-variables.js`, `apps/storefront/tailwind.config.js`, `apps/backend/jest.config.js`)

## Runtime

**Environment:**
- Node.js `>=22.22.0` — Enforced via `engines` in root `package.json` and `apps/backend/package.json`
- Browser runtime — Next.js App Router storefront (React 19 client/server components)

**Package Manager:**
- pnpm `10.33.0` — Declared as `packageManager` in root and both apps
- Lockfile: `pnpm-lock.yaml` present at repo root
- Workspace: `pnpm-workspace.yaml` includes `apps/**`, excludes `apps/backend/.medusa/**`

## Frameworks

**Core:**
- Medusa `@medusajs/medusa` / `@medusajs/framework` `2.21.2` — Headless commerce backend (`apps/backend`)
- Next.js `15.5.24` — Storefront (`apps/storefront`), Turbopack in `pnpm dev`
- React `19.0.5` (storefront) / React `18.3.1` (root/backend admin tooling) — UI for storefront and Medusa Admin extensions

**Testing:**
- Jest `^29.7.0` — Backend unit + integration tests via `apps/backend/jest.config.js` and `@medusajs/test-utils` `2.21.2`
- Storefront — No test suite / test scripts detected

**Build/Dev:**
- Turbo `^2.0.14` — Monorepo task runner (`turbo.json`: `build`, `dev`, `start`, `lint`, `test`, `seed`)
- Medusa CLI `@medusajs/cli` `2.21.2` — `medusa develop` / `medusa build` / `medusa start`
- SWC (`@swc/core`, `@swc/jest`) — Jest transforms and `ts-node` SWC mode in `apps/backend/tsconfig.json`
- Vite `^7.3.6` — Backend admin extension tooling dependency
- Tailwind CSS `^3.0.23` + `@medusajs/ui-preset` — Storefront styling (`apps/storefront/tailwind.config.js`)
- ESLint 9 + `@medusajs/eslint-plugin` `2.21.2` — Root `eslint.config.ts` (recommended Medusa rules); storefront uses `eslint-config-next`
- Prettier — Root `^3.2.5`, storefront `^2.8.8`

## Key Dependencies

**Critical:**
- `@medusajs/js-sdk` `2.21.2` — Storefront → Medusa HTTP client (`apps/storefront/src/lib/config.ts`)
- `@medusajs/types` `2.21.2` — Shared HTTP/domain types on the storefront
- `@medusajs/instantsearch-adapter` `2.21.2` + `react-instantsearch` / `instantsearch.js` — Product search UI over Medusa `/store/search` (`apps/storefront/src/lib/search-client.ts`)
- `@stripe/stripe-js` / `@stripe/react-stripe-js` — Checkout payment Elements for Stripe / Medusa Payments (`apps/storefront/src/modules/checkout/components/payment-wrapper/`)
- `zod` `4.2.0` — Backend validation dependency (Medusa stack)
- `@tanstack/react-query` `5.64.2` — Admin dashboard data fetching (Medusa Admin)

**Infrastructure:**
- PostgreSQL (external) — Primary datastore via `DATABASE_URL` in `apps/backend/medusa-config.ts`; README requires PostgreSQL 15+
- Redis (optional / template) — `REDIS_URL` listed in `apps/backend/.env.template`; not wired in current `medusa-config.ts`
- `@medusajs/caching` `2.21.2` — Medusa caching module package
- `@medusajs/dashboard` / `@medusajs/admin-sdk` `2.21.2` — Admin UI and extension SDK
- `@medusajs/draft-order` `2.21.2` — Draft order commerce module
- `@medusajs/ui` `4.2.6` / `@medusajs/icons` — Admin + storefront UI primitives
- Headless UI / Radix (`@headlessui/react`, `@radix-ui/react-accordion`, `@radix-ui/react-slider`) — Storefront interactive UI
- `pg` `^8.11.3` — Present in storefront `package.json` but unused by application source imports

## Configuration

**Environment:**
- Backend: copy `apps/backend/.env.template` → `apps/backend/.env` (gitignored `.env` may exist locally — do not commit secrets)
- Storefront: `apps/storefront/.env.local` (documented in `README.md`; `.env.template` for storefront is referenced but not present in tree)
- Backend loads env via `loadEnv` in `apps/backend/medusa-config.ts`
- Storefront fails boot without `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (`apps/storefront/check-env-variables.js` invoked from `next.config.js`)

**Key configs required (backend):**
- `DATABASE_URL` — PostgreSQL connection string
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` — CORS allowlists
- `JWT_SECRET`, `COOKIE_SECRET` — Auth/session signing (required in production by Medusa)

**Key configs required (storefront):**
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — Required
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — Defaults to `http://localhost:9000`
- `NEXT_PUBLIC_DEFAULT_REGION` — Defaults to `dk`
- `NEXT_PUBLIC_BASE_URL` — Defaults to `https://localhost:8000`
- `NEXT_PUBLIC_STRIPE_KEY` or `NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY` (+ optional `NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID`) — Stripe-like checkout
- Optional Medusa Cloud image hosts: `MEDUSA_CLOUD_S3_HOSTNAME`, `MEDUSA_CLOUD_S3_PATHNAME`
- Optional sitemap: `NEXT_PUBLIC_VERCEL_URL` in `apps/storefront/next-sitemap.js`

**Build:**
- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `eslint.config.ts`
- Backend: `apps/backend/medusa-config.ts`, `apps/backend/tsconfig.json`, `apps/backend/jest.config.js`, `apps/backend/eslint.config.ts`
- Storefront: `apps/storefront/next.config.js`, `apps/storefront/tsconfig.json` (path aliases `@lib/*`, `@modules/*`, `@pages/*`), `apps/storefront/tailwind.config.js`, `apps/storefront/postcss.config.js`

## Platform Requirements

**Development:**
- Node.js ≥ 22.22.0, pnpm 10.x
- PostgreSQL 15+ with a created database pointed at by `DATABASE_URL`
- Redis optional (template default `redis://localhost:6379`)
- Backend: `http://localhost:9000` (admin at `/app`)
- Storefront: `http://localhost:8000` (`next dev --turbopack -p 8000`)
- No Docker Compose / Dockerfile at repo root for local stack

**Production:**
- Primary documented target: [Medusa Cloud](https://cloud.medusajs.com) (`README.md`)
- Backend: `medusa build` → `medusa start` (Node host with PostgreSQL)
- Storefront: Next.js `next build` / `next start -p 8000` (Vercel-oriented env names present: `NEXT_PUBLIC_VERCEL_URL`)
- Image CDN patterns assume AWS S3 / Medusa Cloud S3 (`apps/storefront/next.config.js` `images.remotePatterns`)

---

*Stack analysis: 2026-10-08*
*Update after major dependency changes*
