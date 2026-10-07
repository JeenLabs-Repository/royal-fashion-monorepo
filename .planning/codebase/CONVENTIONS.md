---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# Coding Conventions

**Analysis Date:** 2026-10-08

## Naming Patterns

**Files:**
- Use **kebab-case** for source files and folders: `seed-demo-products.ts`, `localized-client-link/`, `product-option-filters.ts`
- API routes are always named `route.ts` under a path folder: `apps/backend/src/api/store/custom/route.ts`, `apps/backend/src/api/admin/custom/route.ts`
- Middleware lives in `apps/backend/src/api/middlewares.ts`
- Storefront feature UI lives under `apps/storefront/src/modules/<domain>/components/<name>/index.tsx` (folder + `index.tsx`, not `Name.tsx` at the folder root)
- Storefront templates: `apps/storefront/src/modules/<domain>/templates/` (often `index.tsx` or `*-template.tsx`)
- Backend search helpers: `apps/backend/src/search/helpers/<name>.ts`
- Custom Medusa modules: `apps/backend/src/modules/<module-name>/` with `models/`, `service.ts`, `index.ts` (see `apps/backend/src/modules/README.md`)
- Workflows: `apps/backend/src/workflows/<name>.ts` and steps under `apps/backend/src/workflows/steps/` when splitting steps

**Functions:**
- Use **camelCase**: `retrieveCart`, `toDocument`, `loadPricing`, `convertToLocale`, `makeRandom`
- Export HTTP handlers as named exports matching the method: `GET`, `POST`, `DELETE` in `route.ts` files
- Prefer named `export async function` or `export const fn = async` for storefront server actions in `apps/storefront/src/lib/data/`
- Unused params: prefix with `_` (ESLint allows `^_`): `_currentState` in `apps/storefront/src/lib/data/customer.ts`

**Variables:**
- Use **camelCase** for locals and module-level values: `salesChannel`, `currencyCodes`, `MEDUSA_BACKEND_URL`
- Use **SCREAMING_SNAKE** for true constants: `PRODUCT_COUNT`, `BATCH_SIZE`, `PRICE_CURRENCIES`, `HANDLE_PREFIX` in `apps/backend/src/scripts/seed-demo-products.ts` and `apps/backend/src/search/helpers/pricing.ts`
- Booleans: prefer clear names (`verification_required` from API shapes; local flags like presence checks via `Boolean(...)`)

**Types:**
- Use **PascalCase** for types/interfaces: `ProductRow`, `ProductDocument`, `ConvertToLocaleParams`, `FeaturedProduct`, `VariantPrice` (`apps/storefront/src/types/global.ts`)
- Prefer `type` aliases colocated with the module that owns them
- Reuse Medusa SDK/framework types: `HttpTypes.StoreCart`, `MedusaRequest`, `MedusaResponse`, `SearchTypes.InferSearchDocumentType`
- Props types: `<ComponentName>Props` next to the component (`ProductTabsProps` in `apps/storefront/src/modules/products/components/product-tabs/index.tsx`)

**Database / Medusa models (when adding modules):**
- Table/model names and columns: **snake_case** (project AGENTS + module README examples: `model.define("post", { ... })`)
- Module registration names: **camelCase** only (no dashes) — Medusa skill rule `type-module-name-camelcase`

## Code Style

**Formatting:**
- Project rule (authoritative for new code): **no semicolons**, **double quotes**, **2-space indent** (`AGENTS.md` Code Style)
- Storefront Prettier: `apps/storefront/.prettierrc.json` sets `"semi": false` only — run Prettier against storefront files to match
- Root has Prettier as a dep (`package.json`) but **no root `.prettierrc`** — do not invent a second style; follow AGENTS + storefront prettier
- Existing backend files are mixed (some use semicolons/`@medusajs/...` imports with `;`, e.g. `apps/backend/src/api/store/custom/route.ts` and `apps/backend/src/search/product.ts`; others use no semis / single quotes, e.g. `apps/backend/src/api/middlewares.ts`, `apps/backend/src/scripts/seed-demo-products.ts`). **When editing a file, match that file’s local style; for new files, use no semicolons + double quotes.**

**Linting:**
- Backend + root: ESLint 9 flat config via `eslint.config.ts` and `apps/backend/eslint.config.ts` — `defineConfig([...medusa.configs.recommended])` from `@medusajs/eslint-plugin`
- Run backend lint with `cd apps/backend && pnpm run lint` (`medusa lint`)
- Storefront: `apps/storefront/.eslintrc.json` extends `next/core-web-vitals` and `next/typescript`; unused vars error with `_` ignore patterns
- Run storefront lint with `cd apps/storefront && pnpm run lint` (`next lint`)
- Root: `pnpm run lint` → Turbo `lint` across packages
- **Never disable `@medusajs/*` ESLint rules** to silence failures — fix the Medusa pattern instead (`AGENTS.md`)

## Import Organization

**Order (observed / preferred):**
1. Directive strings first when required: `"use server"` / `"use client"` at top of storefront modules
2. External packages (`@medusajs/...`, `next/...`, `react`, `clsx`)
3. Path-aliased app imports (`@lib/...`, `@modules/...`)
4. Relative imports (`./cookies`, `./helpers/pricing`)

**Path Aliases (storefront only):**
- `@lib/*` → `apps/storefront/src/lib/*` (`apps/storefront/tsconfig.json`)
- `@modules/*` → `apps/storefront/src/modules/*`
- `@pages/*` → `apps/storefront/src/pages/*`
- Backend: relative imports from `src/` (no `@/` alias in `apps/backend/tsconfig.json`)

**Import rules (Medusa backend):**
- Use **static top-level imports** for workflows/modules — no `await import()` inside route bodies
- Import Zod from `@medusajs/framework/zod`, not bare `zod` (framework is Zod v4)
- Prefer framework HTTP types from `@medusajs/framework/http` or `@medusajs/framework` as used in existing routes

**Storefront className helpers:**
- Use `clsx` directly or the re-export `clx` from `apps/storefront/src/modules/common/components/ui/index.tsx` (`export { clsx as clx }`)

## Error Handling

**Patterns:**
- **Backend domain failures:** throw `MedusaError` with a typed variant:
  ```typescript
  throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    "No sales channel or shipping profile found. Run the initial data seed first."
  )
  ```
  Example: `apps/backend/src/scripts/seed-demo-products.ts`
- **Storefront SDK / fetch failures:** pipe through `medusaError` from `apps/storefront/src/lib/util/medusa-error.ts` (logs response details, rethrows `Error` with capitalized message):
  ```typescript
  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(/* ... */)
    .catch(medusaError)
  ```
  Example: `apps/storefront/src/lib/data/cart.ts`
- **Soft failures:** return `null` when absence is expected (e.g. `retrieveCart` `.catch(() => null)`)
- **Auth / form actions:** return typed state objects instead of throwing when the UI needs the message (`{ state: "error", error: String(error) }` in `apps/storefront/src/lib/data/customer.ts`)
- **Simple domain checks:** `throw new Error("...")` for missing cart/region in server actions
- Do not call module services for mutations from routes — use workflows (layer rule); validation belongs in workflow steps

## Logging

**Framework:**
- Backend scripts/seeds: resolve Medusa logger via `container.resolve(ContainerRegistrationKeys.LOGGER)` then `logger.info(...)` — see `apps/backend/src/migration-scripts/initial-data-seed.ts`, `apps/backend/src/scripts/seed-demo-products.ts`
- Storefront error helper: `console.error` for request/response diagnostics inside `medusaError`
- Stub/unimplemented UI: `console.info` (e.g. password update stub in account profile)

**Patterns:**
- Prefer Medusa `LOGGER` for backend operational progress, not ad-hoc `console.log` in production paths
- Keep error logs in `medusaError` before rethrowing so server actions surface a clean `Error` message to callers

## Comments

**When to Comment:**
- File-level purpose for scripts (what it does, how to run, idempotency) — `apps/backend/src/scripts/seed-demo-products.ts`
- Non-obvious invariants (search field filterable vs retrievable, currency index sync) — `apps/backend/src/search/product.ts`, `apps/backend/src/search/helpers/pricing.ts`
- Middleware intent above `defineMiddlewares` — `apps/backend/src/api/middlewares.ts`
- JSDoc on public storefront data helpers when documenting params/returns — `retrieveCart` in `apps/storefront/src/lib/data/cart.ts`
- Avoid narrating obvious code; comment “why” and operational constraints

**JSDoc/TSDoc:**
- Use JSDoc for exported storefront data functions where callers need field/caching behavior
- Component header comments for shared primitives (`LocalizedClientLink` in `apps/storefront/src/modules/common/components/localized-client-link/index.tsx`)

## Function Design

**Size:**
- Keep route handlers thin (resolve + run workflow / return status) — starter routes in `apps/backend/src/api/**/route.ts` are intentionally minimal
- Put indexing/transform logic in helpers under `apps/backend/src/search/helpers/`
- Split UI into colocated subcomponents in the same file when small (`ProductInfoTab` inside product-tabs), or sibling files under the component folder

**Parameters:**
- Prefer object params for multi-arg actions: `addToCart({ variantId, quantity, countryCode })` in `apps/storefront/src/lib/data/cart.ts`
- Server actions used as form actions: `(currentState, formData: FormData)` signature
- Typed request generics on Medusa routes when validating bodies (`MedusaRequest<T>` / `AuthenticatedMedusaRequest` per Medusa skill)

**Return Values:**
- Explicit return types on critical helpers when useful (`medusaError(...): never`, `convertToLocale` string)
- Prefer returning domain objects (`cart`, `customer`) or `null`; auth flows return discriminated state unions
- HTTP: only **GET / POST / DELETE** on Medusa API routes — never PUT/PATCH

## Module Design

**Exports:**
- Storefront components: **default export** the component from `index.tsx` (dominant pattern under `apps/storefront/src/modules/**`)
- Storefront utils: **named exports** (`convertToLocale`, `clx` / UI primitives)
- Backend routes: **named exports** of HTTP methods
- Backend modules: `export default Module(NAME, { service })` plus a `NAME_MODULE` constant (`apps/backend/src/modules/README.md`)
- Workflows: `export default` the workflow created with `createWorkflow`
- Admin widgets: default export component + `export const config = defineWidgetConfig({ zone: "..." })` (`apps/backend/src/admin/README.md`)

**Barrel Files:**
- Use sparingly: UI barrel at `apps/storefront/src/modules/common/components/ui/index.tsx`
- Prefer deep imports via `@modules/...` / `@lib/...` over large barrels
- Admin i18n: `apps/backend/src/admin/i18n/index.ts` currently exports `{}` as placeholder

**Layering (backend — mandatory):**

```text
Module (models + CRUD service)
  → Workflow (mutations + compensation)
    → API route (HTTP + middleware validation)
      → Admin / Storefront (SDK)
```

- Mutations go through workflows; routes must not call module services for writes
- Cross-module reads: `query.graph()` / `query.index()` as appropriate; do not filter linked data in JS

**Client / server boundaries (storefront):**
- Mark data modules `"use server"` under `apps/storefront/src/lib/data/`
- Mark interactive components `"use client"`
- SDK singleton: `apps/storefront/src/lib/config.ts` (`sdk`); never call Medusa store APIs without `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`

---

*Convention analysis: 2026-10-08*
