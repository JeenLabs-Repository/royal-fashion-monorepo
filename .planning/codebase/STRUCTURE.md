---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# Codebase Structure

**Analysis Date:** 2026-10-08

## Directory Layout

```
royal-fashion-monorepo/
├── apps/
│   ├── backend/                 # Medusa v2 API + Admin (@dtc/backend)
│   │   ├── medusa-config.ts     # DB, CORS, JWT/cookie secrets
│   │   ├── instrumentation.ts   # Process instrumentation hook
│   │   ├── integration-tests/   # HTTP integration Jest suites
│   │   ├── src/
│   │   │   ├── api/             # File-based Store/Admin routes + middlewares
│   │   │   ├── admin/           # Admin dashboard extensions (i18n, widgets)
│   │   │   ├── jobs/            # Scheduled jobs (scaffold)
│   │   │   ├── links/           # Module links (scaffold)
│   │   │   ├── modules/         # Custom Medusa modules (scaffold)
│   │   │   ├── workflows/       # Custom workflows (scaffold)
│   │   │   ├── subscribers/     # Event subscribers (scaffold)
│   │   │   ├── search/          # Product search index + helpers
│   │   │   ├── migration-scripts/ # initial-data-seed
│   │   │   └── scripts/         # CLI seed helpers (demo products)
│   │   └── .medusa/             # Generated build output (gitignored / workspace-excluded)
│   └── storefront/              # Next.js 15 storefront (@dtc/storefront)
│       ├── src/
│       │   ├── app/             # App Router routes, layouts, API routes
│       │   ├── lib/             # SDK config, data actions, utils, hooks
│       │   ├── modules/         # Feature UI (account, cart, checkout, …)
│       │   ├── styles/          # Global CSS
│       │   ├── types/           # Shared TS types
│       │   └── middleware.ts    # Region / countryCode enforcement
│       ├── public/              # Static assets
│       └── next.config.js       # Next configuration
├── graft/                       # Codebase context graph (indexed nodes)
├── .planning/                   # GSD planning artifacts
├── .cursor/ · .agents/          # Agent skills / rules
├── package.json                 # Root scripts + pnpm packageManager
├── pnpm-workspace.yaml          # apps/** workspace (excludes .medusa)
├── turbo.json                   # build/dev/start/lint/test/seed graph
├── eslint.config.ts             # Root ESLint (@medusajs plugin)
└── AGENTS.md                    # Repo operating rules for agents
```

## Directory Purposes

**`apps/backend/`:**
- Purpose: Headless Medusa commerce server (Store API, Admin, auth, search)
- Contains: Config, `src/` extension points, Jest integration tests, env templates
- Key files: `apps/backend/medusa-config.ts`, `apps/backend/src/api/middlewares.ts`, `apps/backend/src/search/product.ts`, `apps/backend/src/migration-scripts/initial-data-seed.ts`

**`apps/backend/src/api/`:**
- Purpose: File-based HTTP routes and route middlewares
- Contains: `store/**/route.ts`, `admin/**/route.ts`, `middlewares.ts`
- Key files: `apps/backend/src/api/middlewares.ts`, `apps/backend/src/api/store/custom/route.ts`, `apps/backend/src/api/admin/custom/route.ts`

**`apps/backend/src/search/`:**
- Purpose: Medusa product search index definition used by `/store/search`
- Contains: Index definition + pricing/option helpers
- Key files: `apps/backend/src/search/product.ts`, `apps/backend/src/search/helpers/pricing.ts`

**`apps/backend/src/modules|workflows|subscribers|jobs|links/`:**
- Purpose: Canonical Medusa extension points (mostly README scaffolds today)
- Contains: Guidance READMEs until custom domain code is added
- Key files: respective `README.md` under each directory

**`apps/storefront/src/app/`:**
- Purpose: Next.js App Router entry — URL structure and layouts
- Contains: Root layout, `[countryCode]/(main)` and `(checkout)` route groups, account parallel routes, `api/payment-return`
- Key files: `apps/storefront/src/app/layout.tsx`, `apps/storefront/src/app/[countryCode]/(main)/layout.tsx`, `apps/storefront/src/app/[countryCode]/(main)/account/layout.tsx`, `apps/storefront/src/app/api/payment-return/route.ts`

**`apps/storefront/src/lib/`:**
- Purpose: Server-side data access, SDK, utilities, small hooks/context
- Contains: `data/` Server Actions, `util/`, `hooks/`, `context/`, `config.ts`, `search-client.ts`
- Key files: `apps/storefront/src/lib/config.ts`, `apps/storefront/src/lib/data/cookies.ts`, `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cart.ts`

**`apps/storefront/src/modules/`:**
- Purpose: Feature-oriented UI (components + templates)
- Contains: `account`, `cart`, `checkout`, `products`, `store`, `layout`, `home`, `order`, `shipping`, `categories`, `collections`, `common`, `skeletons`
- Key files: templates under each feature (e.g. `apps/storefront/src/modules/account/templates/login-template.tsx`)

**Root tooling:**
- Purpose: Monorepo orchestration and agent/docs tooling
- Contains: Turbo/pnpm workspace, ESLint, GSD/Cursor skills, graft index
- Key files: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `AGENTS.md`

## Key File Locations

**Entry Points:**
- `apps/storefront/src/middleware.ts`: Country prefix + cache id
- `apps/storefront/src/app/layout.tsx`: Root HTML/layout
- `apps/storefront/src/app/[countryCode]/(main)/page.tsx`: Home
- `apps/storefront/src/app/api/payment-return/route.ts`: Stripe return handler
- `apps/backend/medusa-config.ts`: Medusa process config entry
- `apps/backend/src/api/**/route.ts`: Custom HTTP endpoints

**Configuration:**
- `package.json` / `apps/*/package.json`: Scripts and dependencies
- `pnpm-workspace.yaml`: Workspace package globs
- `turbo.json`: Task graph
- `apps/storefront/tsconfig.json`: Path aliases `@lib/*`, `@modules/*`
- `apps/storefront/next.config.js`: Next build/runtime config
- `apps/backend/.env.template`: Backend env key documentation (not secrets)
- Storefront/backend `.env` files: present locally — never commit or quote values

**Core Logic:**
- Auth/session: `apps/storefront/src/lib/data/customer.ts` + `apps/storefront/src/lib/data/cookies.ts`
- Cart/checkout: `apps/storefront/src/lib/data/cart.ts` + `apps/storefront/src/modules/checkout/`
- Catalog listing/search UI: `apps/storefront/src/modules/store/` + `apps/storefront/src/lib/search-client.ts`
- Product search index: `apps/backend/src/search/product.ts`
- Seed: `apps/backend/src/migration-scripts/initial-data-seed.ts`

**Testing:**
- `apps/backend/jest.config.js`: Jest config (unit / integration:http / integration:modules via `TEST_TYPE`)
- `apps/backend/integration-tests/`: HTTP integration setup and specs
- Storefront: no dedicated test suite detected under `apps/storefront`

## Naming Conventions

**Files:**
- Medusa routes: always `route.ts` under path segments (`apps/backend/src/api/store/custom/route.ts`)
- Storefront UI: kebab-case folders with `index.tsx` entry (`apps/storefront/src/modules/cart/components/empty-cart-message/index.tsx`)
- Storefront data: kebab-case modules (`customer.ts`, `medusa-error.ts`)
- Backend helpers: kebab-case (`resolve-product-ids.ts`, `option-values.ts`)

**Directories:**
- App Router: kebab-case segments; dynamic `[param]`; groups `(main)`, `(checkout)`; parallel `@dashboard`, `@login`
- Feature modules: plural domain names (`products`, `collections`, `account`)
- Medusa API: `store/` vs `admin/` mirrors public surface

**Symbols:**
- Functions/variables: camelCase (`retrieveCustomer`, `getAuthHeaders`)
- Types: PascalCase (`CustomerAuthState`, `PendingCustomer`)
- React components: PascalCase exports
- Cookies / env: SCREAMING or `_medusa_*` cookie names; `NEXT_PUBLIC_*` for browser-exposed storefront env

**Path aliases (storefront):**
- `@lib/*` → `apps/storefront/src/lib/*`
- `@modules/*` → `apps/storefront/src/modules/*`

## Where to Add New Code

**New storefront page / route:**
- Primary code: `apps/storefront/src/app/[countryCode]/(main)/<route>/page.tsx` (or `(checkout)` for checkout-only chrome)
- UI composition: `apps/storefront/src/modules/<feature>/templates/` + `components/`
- Data fetching/mutations: `apps/storefront/src/lib/data/<domain>.ts` (Server Actions / loaders)
- Tests: Not applicable in storefront today — add co-located tests only if a runner is introduced

**New customer-facing API behavior (prefer Medusa):**
- Route: `apps/backend/src/api/store/<path>/route.ts`
- Business logic: `apps/backend/src/workflows/<name>.ts` (+ steps)
- Persist new entities: `apps/backend/src/modules/<name>/` (models, service, `index.ts`) then register in `medusa-config.ts`
- Wire events: `apps/backend/src/subscribers/`; schedules: `apps/backend/src/jobs/`
- Tests: `apps/backend` unit under `**/__tests__/**/*.unit.spec.ts`; HTTP under `apps/backend/integration-tests/http/`

**New auth/session behavior:**
- Cookie names/helpers: `apps/storefront/src/lib/data/cookies.ts`
- Login/register/verify orchestration: `apps/storefront/src/lib/data/customer.ts`
- Account gating UI: `apps/storefront/src/app/[countryCode]/(main)/account/layout.tsx` + `@login` / `@dashboard` slots
- Do not store JWT in `localStorage` or non-httpOnly cookies

**New cart/checkout step:**
- Server mutations: `apps/storefront/src/lib/data/cart.ts`
- UI: `apps/storefront/src/modules/checkout/components/`
- Redirect payment returns: extend `apps/storefront/src/app/api/payment-return/route.ts` carefully (validates payment session secrets)

**New search fields / facets:**
- Backend index: `apps/backend/src/search/product.ts` (+ helpers)
- Storefront InstantSearch attributes: `apps/storefront/src/lib/search-client.ts` and `apps/storefront/src/modules/store/`
- Keep `SEARCH_PRICE_CURRENCIES` in sync with backend `PRICE_CURRENCIES`

**Utilities:**
- Shared pure helpers: `apps/storefront/src/lib/util/`
- Client hooks: `apps/storefront/src/lib/hooks/`
- Do not put SDK calls in `modules/` — call into `@lib/data` instead

**Admin UI extension:**
- Widgets/routes/i18n: `apps/backend/src/admin/`

## Special Directories

**`apps/backend/.medusa/`:**
- Purpose: Medusa build/admin output
- Generated: Yes
- Committed: No (excluded in `pnpm-workspace.yaml`)

**`apps/storefront/.next/`:**
- Purpose: Next.js build cache/output
- Generated: Yes
- Committed: No

**`node_modules/` (root and apps):**
- Purpose: Dependencies via pnpm
- Generated: Yes
- Committed: No

**`graft/`:**
- Purpose: Indexed architecture graph for agents (`graft ask` / `graft map`)
- Generated: Via `graft build`
- Committed: Yes (graph nodes)

**`.planning/`:**
- Purpose: GSD roadmap/codebase maps/phase artifacts
- Generated: By planning skills
- Committed: Per project convention

**Env files (`.env`, `.env.*`):**
- Purpose: Local secrets and runtime config
- Generated: Copied from templates by developers
- Committed: No (use `.env.template` / documented keys only)

## Route Map (Storefront)

| URL pattern | Location |
|-------------|----------|
| `/{countryCode}` | `apps/storefront/src/app/[countryCode]/(main)/page.tsx` |
| `/{countryCode}/store` | `.../(main)/store/page.tsx` |
| `/{countryCode}/products/[handle]` | `.../(main)/products/[handle]/page.tsx` |
| `/{countryCode}/cart` | `.../(main)/cart/page.tsx` |
| `/{countryCode}/checkout` | `.../(checkout)/checkout/page.tsx` |
| `/{countryCode}/account` | Parallel `@login` / `@dashboard` under `.../account/` |
| `/{countryCode}/verify-account` | `.../(main)/verify-account/page.tsx` |
| `/{countryCode}/order/[id]/confirmed` | `.../(main)/order/[id]/confirmed/page.tsx` |
| `/api/payment-return` | `apps/storefront/src/app/api/payment-return/route.ts` |

## Cookie Map (Session)

| Cookie | Set by | Role |
|--------|--------|------|
| `_medusa_jwt` | `setAuthToken` in `cookies.ts` | Customer Bearer token |
| `_medusa_cart_id` | `setCartId` | Active cart id |
| `_medusa_pending_customer` | `setPendingCustomer` | Signup fields until customer create |
| `_medusa_cache_id` | middleware | Per-visitor Next cache tag namespace |

---

*Structure analysis: 2026-10-08*
*Update when directory structure changes*
