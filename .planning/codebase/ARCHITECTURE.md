---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
<!-- refreshed: 2026-10-08 -->

# Architecture

**Analysis Date:** 2026-10-08

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 Client (Browser / Edge)                      │
│  Next.js App Router · middleware region redirect             │
│  `apps/storefront/src/middleware.ts`                         │
├──────────────────┬──────────────────┬───────────────────────┤
│  Route pages     │  Server Actions  │  UI modules           │
│  `src/app/`      │  `src/lib/data/` │  `src/modules/`       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Medusa JS SDK (`@lib/config` → sdk)             │
│  Bearer JWT from `_medusa_jwt` · publishable API key         │
│  `apps/storefront/src/lib/config.ts`                         │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP /store · /auth
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Medusa Backend (`@dtc/backend`)              │
│  File-based API · Auth · Cart · Order · Search middleware    │
│  `apps/backend/medusa-config.ts` · `apps/backend/src/api/`   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL (DATABASE_URL) · Medusa core modules · Search    │
│  Product index: `apps/backend/src/search/product.ts`         │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Turborepo root | Workspace scripts, lint/test orchestration | `package.json`, `turbo.json`, `pnpm-workspace.yaml` |
| Storefront middleware | Country/region URL prefix, `_medusa_cache_id` cookie | `apps/storefront/src/middleware.ts` |
| Medusa SDK client | Typed Store/Auth API client + locale header injection | `apps/storefront/src/lib/config.ts` |
| Cookie session layer | JWT, cart id, pending signup, cache tags | `apps/storefront/src/lib/data/cookies.ts` |
| Customer auth actions | Register/login/verify/signout + cart transfer | `apps/storefront/src/lib/data/customer.ts` |
| Cart / checkout actions | Cart CRUD, payment session, place order | `apps/storefront/src/lib/data/cart.ts` |
| Account parallel routes | Logged-in dashboard vs login slot | `apps/storefront/src/app/[countryCode]/(main)/account/layout.tsx` |
| Search adapter | InstantSearch → `POST /store/search` | `apps/storefront/src/lib/search-client.ts` |
| Payment return route | Stripe redirect resume + `placeOrder` | `apps/storefront/src/app/api/payment-return/route.ts` |
| Medusa config | DB URL, CORS, JWT/cookie secrets | `apps/backend/medusa-config.ts` |
| Store search middleware | Restrict searchable indexes to product | `apps/backend/src/api/middlewares.ts` |
| Product search index | Index fields, pricing, facets | `apps/backend/src/search/product.ts` |
| Seed / migrations | Initial store, regions, products, API keys | `apps/backend/src/migration-scripts/initial-data-seed.ts` |
| Custom API stubs | Placeholder store/admin routes | `apps/backend/src/api/store/custom/route.ts`, `apps/backend/src/api/admin/custom/route.ts` |

## Pattern Overview

**Overall:** Turborepo monorepo — Medusa v2 headless commerce backend + Next.js App Router storefront (DTC starter).

**Key Characteristics:**
- Backend owns commerce domain (auth identities, customers, carts, orders, catalog, search); storefront is a typed BFF/UI client over the Medusa Store API
- Storefront uses React Server Components and `"use server"` Server Actions in `apps/storefront/src/lib/data/*` — no separate Node BFF
- Session is cookie-backed JWT (`_medusa_jwt`), not NextAuth/session cookies on Medusa itself
- Region is a first-class URL segment (`/[countryCode]/...`) enforced by Edge middleware
- Backend customizations are thin today: search index + seed scripts; modules/workflows/subscribers dirs are scaffolded for extension

## Layers

**Presentation (Storefront UI):**
- Purpose: Render commerce UI; collect form input; compose layouts
- Location: `apps/storefront/src/modules/`, `apps/storefront/src/app/`
- Contains: Feature modules (account, cart, checkout, products, store, layout), route `page.tsx` / layouts, parallel route slots
- Depends on: Data layer Server Actions and loaders under `apps/storefront/src/lib/data/`
- Used by: Browser via Next.js App Router

**Application / Data (Storefront Server Actions):**
- Purpose: Orchestrate Medusa SDK calls, cookies, cache tags, redirects
- Location: `apps/storefront/src/lib/data/`
- Contains: `customer.ts`, `cart.ts`, `products.ts`, `regions.ts`, `orders.ts`, `payment.ts`, etc.
- Depends on: `sdk` from `apps/storefront/src/lib/config.ts`, cookies from `apps/storefront/src/lib/data/cookies.ts`
- Used by: App Router pages and client components via `useActionState` / form actions

**SDK boundary:**
- Purpose: Single HTTP client to Medusa with publishable key + optional Bearer auth + `x-medusa-locale`
- Location: `apps/storefront/src/lib/config.ts`
- Contains: `Medusa` JS SDK instance, wrapped `sdk.client.fetch`
- Depends on: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- Used by: All storefront data modules and some API routes

**API / HTTP (Medusa):**
- Purpose: Expose Store and Admin REST APIs; attach route middlewares
- Location: `apps/backend/src/api/` (file-based `route.ts`)
- Contains: Custom store/admin routes, `middlewares.ts` for `/store/search`
- Depends on: Medusa framework HTTP helpers, DI container (`req.scope`)
- Used by: Storefront SDK, Admin dashboard, InstantSearch adapter

**Domain / Workflows (Medusa):**
- Purpose: Business logic as composable workflows and module services
- Location: `apps/backend/src/workflows/`, `apps/backend/src/modules/`, core flows from `@medusajs/medusa/core-flows`
- Contains: Scaffold READMEs for custom modules/workflows; seed uses core workflows extensively
- Depends on: Medusa module services and Query/Link APIs
- Used by: API routes, subscribers, jobs, migration scripts

**Search index:**
- Purpose: Define product documents for Medusa store search
- Location: `apps/backend/src/search/`
- Contains: `product.ts` + helpers (`pricing.ts`, `option-values.ts`, `resolve-product-ids.ts`)
- Depends on: Framework search utilities (`defineSearchIndex`, graph seed/consume)
- Used by: `POST /store/search` (gated by `configureStoreSearch` in `apps/backend/src/api/middlewares.ts`)

**Persistence:**
- Purpose: Durable commerce state
- Location: PostgreSQL via `DATABASE_URL` in `apps/backend/medusa-config.ts`
- Contains: Medusa core tables + any future custom module models
- Depends on: Medusa ORM / module data models
- Used by: All backend modules and workflows

## Data Flow

### Primary Request Path (catalog / cart page)

1. Browser hits `/{countryCode}/...`; middleware validates country against `/store/regions` and sets `_medusa_cache_id` (`apps/storefront/src/middleware.ts`)
2. App Router RSC page loads (e.g. `apps/storefront/src/app/[countryCode]/(main)/cart/page.tsx`)
3. Page calls data loaders such as `retrieveCart()` / `retrieveCustomer()` (`apps/storefront/src/lib/data/cart.ts`, `apps/storefront/src/lib/data/customer.ts`)
4. Loaders read `_medusa_jwt` / `_medusa_cart_id` via `getAuthHeaders()` / `getCartId()` (`apps/storefront/src/lib/data/cookies.ts`)
5. SDK calls Medusa Store API with publishable key + optional `Authorization: Bearer <jwt>` (`apps/storefront/src/lib/config.ts`)
6. Response cached with Next tags from `getCacheOptions("carts"|"customers"|...)`; UI module templates render

### Customer Auth / Session Flow

1. Login/register form submits to Server Action `login` / `signup` (`apps/storefront/src/lib/data/customer.ts`)
2. `signup` calls `sdk.auth.register("customer", "emailpass", ...)` then stores pending profile in `_medusa_pending_customer`
3. `completeLogin` calls `sdk.auth.login("customer", "emailpass", ...)`:
   - `verification_required` → request verification email, return UI state (no JWT cookie)
   - JWT string → probe `sdk.store.customer.retrieve`; if missing actor, `customer.create` using pending cookie, then login again
4. Successful JWT stored in httpOnly `_medusa_jwt` via `setAuthToken` (`apps/storefront/src/lib/data/cookies.ts`)
5. `transferCart()` attaches guest `_medusa_cart_id` to the authenticated customer
6. Account layout chooses parallel slot: `customer ? dashboard : login` (`apps/storefront/src/app/[countryCode]/(main)/account/layout.tsx`)
7. Signout: `sdk.auth.logout()`, clear JWT + cart cookies, revalidate tags, redirect to `/{countryCode}/account`

### Checkout / Payment Flow

1. Checkout UI initiates payment session via `initiatePaymentSession` (`apps/storefront/src/lib/data/cart.ts`) using auth headers
2. Stripe Elements confirm with `return_url` → `/api/payment-return` (`apps/storefront/src/modules/checkout/components/payment-button/index.tsx`)
3. `apps/storefront/src/app/api/payment-return/route.ts` validates payment session against cart, restores cart cookie, calls `placeOrder`, redirects to order confirmation or failure

### Search Flow

1. Navbar / store InstantSearch UI uses `searchClient` from `apps/storefront/src/lib/search-client.ts`
2. Adapter posts to Medusa `/store/search` through the SDK
3. Backend middleware `configureStoreSearch({ allowed_indexes: { product: true } })` (`apps/backend/src/api/middlewares.ts`)
4. Hits shaped by product index definition in `apps/backend/src/search/product.ts`

**State Management:**
- Server: Medusa/PostgreSQL is source of truth for customers, carts, orders, catalog
- Browser session: httpOnly cookies `_medusa_jwt`, `_medusa_cart_id`, `_medusa_pending_customer`, `_medusa_cache_id` (`apps/storefront/src/lib/data/cookies.ts`)
- UI cache: Next.js `revalidateTag` + per-visitor cache id tags (`getCacheTag`)
- Client React state: local UI only (dropdowns, Stripe elements, InstantSearch widgets) — not the commerce session

## Key Abstractions

**Medusa JS SDK (`sdk`):**
- Purpose: Typed client for Auth + Store APIs
- Examples: `apps/storefront/src/lib/config.ts`, callers in `apps/storefront/src/lib/data/*.ts`
- Pattern: Singleton module export; fetch wrapper injects locale header

**Cookie session helpers:**
- Purpose: Bridge Next cookies ↔ Medusa auth/cart identity
- Examples: `getAuthHeaders`, `setAuthToken`, `getCartId`, `setPendingCustomer` in `apps/storefront/src/lib/data/cookies.ts`
- Pattern: `server-only` helpers; httpOnly cookies; `sameSite: "lax"` for JWT/cart (payment redirects)

**Server Action data modules:**
- Purpose: Mutating commerce operations from forms
- Examples: `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cart.ts`
- Pattern: `"use server"` file; FormData actions return discriminated unions (e.g. `CustomerAuthState`)

**Feature modules (UI):**
- Purpose: Domain-grouped presentational components and templates
- Examples: `apps/storefront/src/modules/account/`, `apps/storefront/src/modules/checkout/`
- Pattern: `components/` + `templates/`; imported via `@modules/*`

**File-based Medusa API routes:**
- Purpose: HTTP endpoints under `/store/*` and `/admin/*`
- Examples: `apps/backend/src/api/store/custom/route.ts`
- Pattern: Export named HTTP methods (`GET`, `POST`, ...) from `route.ts`

**Search index definition:**
- Purpose: Declares searchable/filterable product fields and document mapping
- Examples: `apps/backend/src/search/product.ts`
- Pattern: `defineSearchIndex` + graph seed/consume helpers

**Core workflows (seed):**
- Purpose: Idempotent commerce setup via Medusa core flows
- Examples: `createProductsWorkflow`, `createRegionsWorkflow` in `apps/backend/src/migration-scripts/initial-data-seed.ts`
- Pattern: Resolve container services; run workflows; link resources

## Entry Points

**Storefront HTTP / RSC:**
- Location: `apps/storefront/src/app/`
- Triggers: Browser navigation to `http://localhost:8000`
- Responsibilities: Layouts, pages, parallel account slots, payment-return API

**Storefront Edge middleware:**
- Location: `apps/storefront/src/middleware.ts`
- Triggers: Matched navigations (excludes static assets/api)
- Responsibilities: Region map fetch, country redirect, cache id cookie

**Storefront Server Actions:**
- Location: `apps/storefront/src/lib/data/*.ts`
- Triggers: Form posts / action invocations from modules
- Responsibilities: Auth, cart, orders, profile mutations

**Medusa process:**
- Location: `apps/backend` via `medusa develop` / `medusa start` (`apps/backend/package.json`)
- Triggers: `pnpm run backend:dev` / Turbo `dev` filter `@dtc/backend`
- Responsibilities: Store API `:9000`, Admin UI `/app`, auth, search, jobs

**Medusa custom API:**
- Location: `apps/backend/src/api/**/route.ts`
- Triggers: HTTP to Store/Admin paths
- Responsibilities: Custom endpoints (stubs today) + middleware registration

**Seed / scripts:**
- Location: `apps/backend/src/migration-scripts/initial-data-seed.ts`, `apps/backend/src/scripts/seed-demo-products.ts`
- Triggers: `pnpm run backend:seed` / Medusa script runners
- Responsibilities: Bootstrap store data for local/dev

## Architectural Constraints

- **Threading:** Node single-threaded event loop for Medusa and Next server; storefront middleware runs on Edge — cannot use Node-only Medusa JS SDK there (uses raw `fetch` for regions)
- **Global state:** In-memory `regionMapCache` in `apps/storefront/src/middleware.ts`; singleton `sdk` in `apps/storefront/src/lib/config.ts`
- **Circular imports:** Avoid importing UI modules into `lib/data` or cookies into client components; cookies module is `server-only`
- **Auth actor model:** Auth identity (emailpass) is distinct from Customer actor — login may yield a token that still requires `customer.create` before `/store/customers/me` works (`completeLogin` in `apps/storefront/src/lib/data/customer.ts`)
- **Publishable key required:** Store API calls from storefront must send `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (SDK config); middleware region fetch sets `x-publishable-api-key` explicitly
- **CORS / secrets:** Backend `STORE_CORS`, `AUTH_CORS`, `ADMIN_CORS`, `JWT_SECRET`, `COOKIE_SECRET` configured in `apps/backend/medusa-config.ts` — storefront origin must be listed for browser-originated calls
- **Extension points empty by default:** Put new backend domain logic in `apps/backend/src/modules/` + `workflows/`; do not put business logic in route handlers when a workflow fits

## Anti-Patterns

### Business logic in route handlers

**What happens:** Custom Medusa `route.ts` files grow large with multi-step commerce logic.
**Why it's wrong:** Routes should resolve services/workflows; logic becomes untestable and bypasses Medusa compensation patterns.
**Do this instead:** Create steps/workflows under `apps/backend/src/workflows/` and call them from the route (see `apps/backend/src/workflows/README.md`).

### Calling Medusa SDK from client components without auth strategy

**What happens:** Client code imports `sdk` and expects `_medusa_jwt` to be available.
**Why it's wrong:** JWT is httpOnly; browser JS cannot read it. Client-side SDK calls would be unauthenticated or require unsafe token exposure.
**Do this instead:** Use Server Actions / RSC loaders in `apps/storefront/src/lib/data/` that call `getAuthHeaders()`.

### Skipping cart transfer after login

**What happens:** Login sets JWT but leaves a guest cart orphaned.
**Why it's wrong:** Customer loses cart contents; checkout state diverges from cookie cart id.
**Do this instead:** Always call `transferCart()` after successful `setAuthToken` (as in `completeLogin`).

### Using `sameSite: "strict"` for JWT/cart cookies

**What happens:** Cookies withheld on return from redirect-based payment methods.
**Why it's wrong:** Checkout resumes as logged-out/cartless and can 404.
**Do this instead:** Keep `sameSite: "lax"` for `_medusa_jwt` and `_medusa_cart_id` (`apps/storefront/src/lib/data/cookies.ts`).

## Error Handling

**Strategy:** Storefront data layer normalizes Medusa/SDK failures into thrown `Error` messages or discriminated action states; pages often `.catch(() => null)` for optional customer/cart.

**Patterns:**
- `medusaError()` in `apps/storefront/src/lib/util/medusa-error.ts` logs response details and rethrows a user-facing message
- Auth actions return `{ state: "error" | "verification_required" | "success" }` instead of throwing for form UX (`CustomerAuthState`)
- Payment return uses `unstable_rethrow` so Next redirects propagate, then redirects to cart with `error=` query on failure (`apps/storefront/src/app/api/payment-return/route.ts`)
- Backend stub routes return HTTP status only; framework errors surface via Medusa HTTP layer

## Cross-Cutting Concerns

**Logging:** Storefront uses `console.error` in `medusaError` and select pages; backend uses Medusa container `LOGGER` in seed scripts (`apps/backend/src/migration-scripts/initial-data-seed.ts`). No separate APM layer detected in app code.

**Validation:** Medusa/framework + Zod available on backend (`apps/backend/package.json`); storefront relies on HTML form constraints and Medusa API validation. Prefer Zod at new custom API boundaries.

**Authentication:**
- Customer: Medusa Auth emailpass → JWT in `_medusa_jwt` → Bearer on Store API
- Email verification optional, driven by backend login response (`verification_required`)
- Admin: Medusa Admin dashboard auth (separate from storefront cookies)
- Publishable API key scopes storefront store access; never treat it as a user credential

**Caching:** Next `force-cache` + tag revalidation keyed by `_medusa_cache_id` so one visitor’s cart/customer cache does not leak to another.

**i18n / locale:** SDK fetch wrapper attaches `x-medusa-locale` from `getLocaleHeader()` (`apps/storefront/src/lib/config.ts`, `apps/storefront/src/lib/util/get-locale-header.ts`).

**Payments:** Stripe React SDK in storefront; Medusa payment sessions on cart; return path centralized in `apps/storefront/src/app/api/payment-return/route.ts`.

---

*Architecture analysis: 2026-10-08*
*Update when major patterns change*
