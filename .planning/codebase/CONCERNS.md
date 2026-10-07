---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# Codebase Concerns

**Analysis Date:** 2026-10-08

## Tech Debt

**Medusa-native customer auth (HIGH — blocks planned Supabase migration):**
- Issue: Storefront customer identity is entirely Medusa `emailpass` + JWT cookie (`_medusa_jwt`). Login, register, verification, logout, pending-signup cookie, and cart transfer all assume Medusa Auth. There is no auth abstraction layer.
- Files: `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cookies.ts`, `apps/storefront/src/modules/account/components/login/index.tsx`, `apps/storefront/src/modules/account/components/register/index.tsx`, `apps/storefront/src/lib/config.ts`
- Impact: Any Supabase (or other IdP) migration must rewrite `signup` / `login` / `completeLogin` / `confirmEmailVerification` / `signout`, cookie helpers, and every consumer of `getAuthHeaders` (hub: ~29 call sites across cart, customer, fulfillment, payment-return). Customer create-on-first-login and email-verification branching are Medusa-specific.
- Fix approach: Introduce an auth adapter (session + customer actor binding) before feature work; keep Medusa customer/cart APIs behind a thin “attach customer to session” step. Inventory all `sdk.auth.*` and `_medusa_jwt` usages; migrate verification and password flows with Supabase as source of truth; map Supabase user → Medusa customer ID explicitly.

**Password change UI stubbed / removed:**
- Issue: `ProfilePassword` only logs `"Password update is not implemented"`; profile page comments the component out while copy still promises password changes.
- Files: `apps/storefront/src/modules/account/components/profile-password/index.tsx`, `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/profile/page.tsx`
- Impact: Customers cannot change passwords in-product. Misleading UX if the component is re-enabled. Supabase migration must own password reset/update rather than finishing this Medusa stub.
- Fix approach: Either remove password promises from profile copy, or implement IdP-backed change/reset (prefer Supabase Auth APIs once migration lands). Do not wire a half Medusa `emailpass` update if Supabase is the target.

**Email update is a fake success:**
- Issue: `updateCustomerEmail` returns `{ success: true }` without calling the API; `updateCustomer` import is commented out.
- Files: `apps/storefront/src/modules/account/components/profile-email/index.tsx`
- Impact: Profile UI reports success while email never changes — trust and support risk.
- Fix approach: Disable the editor until a real provider-backed email change exists, or implement Medusa/Supabase email update with verification.

**Gift card apply/remove dead code:**
- Issue: `applyGiftCard` / `removeGiftCard` bodies are fully commented; checkout UI still branches on `gift_cards`.
- Files: `apps/storefront/src/lib/data/cart.ts`, `apps/storefront/src/modules/checkout/components/payment/index.tsx`, `apps/storefront/src/modules/checkout/components/review/index.tsx`
- Impact: Gift-card checkout paths are non-functional or inconsistent with server capabilities.
- Fix approach: Restore against Medusa v2 promotions/gift-card APIs, or strip UI branches until supported.

**Toaster / notifications removed:**
- Issue: Multiple TODOs to re-add Toaster; account and transfer flows lack user feedback.
- Files: `apps/storefront/src/modules/common/components/ui/index.tsx`, `apps/storefront/src/app/[countryCode]/(main)/account/layout.tsx`, `apps/storefront/src/modules/account/components/transfer-request-form/index.tsx`, `apps/storefront/src/modules/account/components/profile-password/index.tsx`
- Impact: Silent failures on account actions; harder QA.
- Fix approach: Restore a single notification primitive and use it on auth/account mutations.

**Hardcoded cart quantity ceiling:**
- Issue: Max line quantity fixed at `10` regardless of inventory.
- Files: `apps/storefront/src/modules/cart/components/item/index.tsx`
- Impact: Oversell UX or artificial purchase limits; inventory-managed variants still capped at 10.
- Fix approach: Read variant inventory / availability from cart line payload (Medusa v2 inventory fields) and clamp the select options.

**Search index event gaps:**
- Issue: Documented TODOs: price lists, sales-channel linking, category batch linking, and direct `upsertVariantPricesWorkflow` do not emit reindex events.
- Files: `apps/backend/src/search/product.ts`
- Impact: Stale prices, channels, or categories in `/store/search` hits after admin changes.
- Fix approach: Subscribe to missing workflows/events or schedule catch-up reindex jobs for price-list and link mutations.

**Placeholder custom API routes:**
- Issue: Store and admin `custom` routes only `res.sendStatus(200)`.
- Files: `apps/backend/src/api/store/custom/route.ts`, `apps/backend/src/api/admin/custom/route.ts`
- Impact: Noise for monitors; risk of accidental production exposure if used as health checks incorrectly.
- Fix approach: Remove stubs or replace with a real `/health` (or Medusa health) endpoint.

**Onboarding redirect hardcoded to local admin:**
- Issue: `resetOnboardingState` redirects to `http://localhost:7001/a/orders/...`.
- Files: `apps/storefront/src/lib/data/onboarding.ts`
- Impact: Broken in any non-local deploy; wrong host for Medusa admin (typically `:9000/app`).
- Fix approach: Drive admin base URL from env; no-op or gate behind `NODE_ENV === "development"`.

**Default region `dk`:**
- Issue: Middleware falls back to `NEXT_PUBLIC_DEFAULT_REGION || "dk"`.
- Files: `apps/storefront/src/middleware.ts`
- Impact: Wrong geo/currency for Royal Fashion if India (or other) is the primary market and env is unset.
- Fix approach: Set `NEXT_PUBLIC_DEFAULT_REGION` in all envs; change code default only after regions are confirmed in seed/admin.

**Starter-kit branding / copy debt:**
- Issue: Profile metadata still says “Medusa Store”; footer CTA “Powered by Medusa & Next.js”.
- Files: `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/profile/page.tsx`, `apps/storefront/src/modules/layout/components/medusa-cta/index.tsx`
- Impact: Brand dilution for production storefront.
- Fix approach: Replace with Royal Fashion copy/assets before go-live.

**React version split across workspace:**
- Issue: Root `package.json` pins `react@18.3.1`; storefront depends on `react@19.0.5` with pnpm overrides for `@types/react` 19.
- Files: `package.json`, `apps/storefront/package.json`
- Impact: Peer-dependency friction for shared tooling; subtle dual-React risk if root and app resolve differently.
- Fix approach: Align workspace React major (prefer storefront’s 19) and drop conflicting root runtime deps if unused.

## Known Bugs

**`retrieveCustomer` empty-headers check is ineffective:**
- Symptoms: `getAuthHeaders()` returns `{}` when unauthenticated; `if (!authHeaders)` never triggers because `{}` is truthy. Unauthenticated calls hit `/store/customers/me` and rely on `.catch(() => null)`.
- Files: `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cookies.ts`
- Trigger: Any server render that calls `retrieveCustomer` without `_medusa_jwt`.
- Workaround: Harmless today (catch returns null) but wastes a backend round-trip and masks auth-header bugs during migration.
- Fix: Check for `authorization` in the returned object (e.g. `"authorization" in authHeaders`).

**`setAddresses` does not await `getCartId()`:**
- Symptoms: `const cartId = getCartId()` yields a Promise; the null check never fails; `cartId` is unused — `updateCart` re-reads the cookie. Error messaging for missing cart is dead code.
- Files: `apps/storefront/src/lib/data/cart.ts` (`setAddresses`)
- Trigger: Checkout address step when no cart cookie exists (failure deferred to `updateCart`).
- Workaround: None reliable — depends on `updateCart` throwing.
- Fix: `const cartId = await getCartId()` and early-return/throw if missing.

**`placeOrder` does not await `removeCartId()`:**
- Symptoms: Cart cookie clear may race with redirect after successful order.
- Files: `apps/storefront/src/lib/data/cart.ts` (`placeOrder`)
- Trigger: Successful checkout completion.
- Workaround: Cache revalidation usually enough; intermittent stale cart possible.
- Fix: `await removeCartId()`.

**`deleteCustomerAddress` return type vs implementation:**
- Symptoms: Declared `Promise<void>` but `then`/`catch` return `{ success, error }` objects that callers cannot observe.
- Files: `apps/storefront/src/lib/data/customer.ts`
- Trigger: Address delete from account UI.
- Workaround: Rely on cache revalidation / page refresh.
- Fix: Align signature with `addCustomerAddress` / `updateCustomerAddress` and surface errors in the UI.

**Profile email reports success without mutation:**
- Symptoms: Saving email shows success state; value unchanged after refresh.
- Files: `apps/storefront/src/modules/account/components/profile-email/index.tsx`
- Trigger: Edit email on profile page and save.
- Workaround: Do not use the email editor until fixed.

## Security Considerations

**Customer JWT and PII cookies:**
- Risk: `_medusa_jwt` (session) and `_medusa_pending_customer` (signup PII: email, name, phone) live in cookies. Pending customer is JSON in an httpOnly cookie for 24h. JWT uses `sameSite: "lax"` (documented for payment redirects).
- Files: `apps/storefront/src/lib/data/cookies.ts`, `apps/storefront/src/lib/data/customer.ts`
- Current mitigation: `httpOnly`, `secure` in production, pending cookie `sameSite: "strict"`.
- Recommendations: Minimize PII in cookies (server-side pending store keyed by verification token); rotate JWT secrets; for Supabase migration prefer HttpOnly session cookies from Supabase SSR helpers and never mirror passwords. Audit cookie domain/path for multi-subdomain deploy.

**Template secrets look production-ready:**
- Risk: `apps/backend/.env.template` ships `JWT_SECRET=supersecret` and `COOKIE_SECRET=supersecret`. Easy to copy into prod unchanged.
- Files: `apps/backend/.env.template`
- Current mitigation: Template only (values are placeholders).
- Recommendations: Use empty placeholders + comments requiring random secrets; fail boot if secrets equal known defaults in production.

**Error logger may leak response headers:**
- Risk: `medusaError` `console.error`s response data, status, and headers.
- Files: `apps/storefront/src/lib/util/medusa-error.ts`
- Current mitigation: Server-side only in Server Actions / RSC.
- Recommendations: Log sanitized messages in production; never log Authorization or Stripe client secrets.

**Publishable key required in Edge middleware:**
- Risk: Middleware fetches `/store/regions` with `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`; missing key throws; wrong key scopes sales channels incorrectly.
- Files: `apps/storefront/src/middleware.ts`, `apps/storefront/check-env-variables.js`
- Current mitigation: `check-env-variables.js` validates publishable key at storefront start.
- Recommendations: Keep publishable key non-secret but rotate if leaked; ensure storefront `.env.example` documents all `NEXT_PUBLIC_*` keys (storefront lacks a committed `.env.template` today).

**Manual payment provider in seed:**
- Risk: Seed configures `manual_manual` fulfillment/payment; storefront still supports ManualTestPaymentButton.
- Files: `apps/backend/src/migration-scripts/initial-data-seed.ts`, `apps/storefront/src/modules/checkout/components/payment-button/index.tsx`
- Current mitigation: Manual test UI gated with `isDevelopment` in payment container; button still selectable if provider enabled.
- Recommendations: Disable manual provider in production regions; require Stripe (or chosen PSP) only.

**No CI security / audit gate:**
- Risk: No `.github/workflows` (or other CI) detected; `turbo test` / lint not enforced on PR.
- Files: repo root (absence of `.github/`), `turbo.json`
- Current mitigation: Local scripts only (`pnpm run lint`, `pnpm run test`).
- Recommendations: Add CI for lint, typecheck, unit/integration tests, and `pnpm audit --audit-level=high` before merge.

**Auth migration attack surface:**
- Risk: Dual-running Medusa passwords and Supabase Auth without a cutover plan can leave orphan identities, replayable JWTs, or account-linking collisions (code already special-cases “Identity with email already exists”).
- Files: `apps/storefront/src/lib/data/customer.ts` (`signup` Unauthorized / existing identity branch)
- Current mitigation: Documented Medusa identity collision handling for admin/customer email overlap.
- Recommendations: Explicit migration plan: freeze Medusa password login, migrate hashes or force reset, link `auth_identity` ↔ Supabase `user.id`, invalidate `_medusa_jwt` after cutover.

## Performance Bottlenecks

**Middleware region fetch + in-memory map:**
- Problem: Every navigation without a country prefix can hit region resolution; region map cached in module memory for 1 hour per isolate.
- Files: `apps/storefront/src/middleware.ts`
- Cause: Edge middleware + backend `/store/regions` dependency; cold isolates refetch.
- Improvement path: Ensure `_medusa_cache_id` / Next fetch cache tags work in the host; prefer CDN-level geo routing; keep region list small.

**Customer retrieve uses `force-cache`:**
- Problem: `retrieveCustomer` uses `cache: "force-cache"` with per-session tags; mis-tagging yields stale account/order UI.
- Files: `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cookies.ts` (`getCacheTag`)
- Cause: Cache ID cookie + tag revalidation complexity; empty cache tag disables tagging.
- Improvement path: Fail closed when cache ID missing for authenticated reads; add integration tests for login → profile freshness.

**Search reindex gaps cause stale catalog:**
- Problem: Price/channel/category changes may not refresh search documents until unrelated product events.
- Files: `apps/backend/src/search/product.ts`
- Cause: Missing event subscriptions (see TODOs).
- Improvement path: Event coverage or periodic full reindex for pricing fields.

**Auth header hub fan-out:**
- Problem: Nearly every store data helper awaits cookies for auth/cache tags (29← on `getAuthHeaders`).
- Files: `apps/storefront/src/lib/data/cookies.ts` and callers in `cart.ts`, `customer.ts`, `fulfillment.ts`, `payment-return/route.ts`, etc.
- Cause: Per-request cookie reads + tag computation on hot paths.
- Improvement path: Batch cookie reads once per Server Action / RSC request context when migrating auth.

## Fragile Areas

**Customer auth + cart transfer pipeline (HIGH):**
- Files: `apps/storefront/src/lib/data/customer.ts` (`completeLogin`, `transferCart`, `setPendingCustomer`), `apps/storefront/src/lib/data/cookies.ts`
- Why fragile: Multi-step: login → verification_required vs token string → retrieve-or-create customer → second login → set JWT → transfer cart. Any IdP change breaks checkout for logged-in users. Pending customer cookie must survive email verification across devices incompletely (fields only on original device).
- Safe modification: Change one step at a time with HTTP integration tests for register/verify/login/transfer; never alter cookie names without migration.
- Test coverage: No storefront tests; backend integration suites configured but no `__tests__` / `*.spec.ts` files present.

**Checkout payment return:**
- Files: `apps/storefront/src/app/api/payment-return/route.ts`, `apps/storefront/src/modules/checkout/components/payment-button/index.tsx`
- Why fragile: Relies on query params matching payment session `client_secret`; cookie `sameSite: "lax"` required for return navigation; `placeOrder` redirect interaction with `unstable_rethrow`.
- Safe modification: Keep return URL contract; add e2e for redirect-based methods before cookie flag changes.
- Test coverage: None automated.

**Region middleware:**
- Files: `apps/storefront/src/middleware.ts`
- Why fragile: Throws if `NEXT_PUBLIC_MEDUSA_BACKEND_URL` unset; empty regions yield empty map; default `dk`.
- Safe modification: Always seed regions matching default country before storefront boot.
- Test coverage: None.

**Product search ingestion:**
- Files: `apps/backend/src/search/product.ts`, `apps/backend/src/search/helpers/pricing.ts`, `apps/backend/src/api/middlewares.ts`
- Why fragile: Index correctness depends on event coverage and pricing helper; store search middleware allowlists `product` only.
- Safe modification: Extend `PRODUCT_EVENTS` and helpers together; re-seed index after schema field changes.
- Test coverage: None for search helpers.

## Scaling Limits

**Storefront Edge middleware region cache:**
- Current capacity: One in-memory `Map` per middleware isolate, 1-hour TTL.
- Limit: Many Edge isolates → repeated `/store/regions` load; large region/country sets increase middleware latency.
- Scaling path: External cache (KV) or build-time region snapshot for country list.

**Medusa monolith + Postgres:**
- Current capacity: Single Medusa 2.21.2 backend (`@dtc/backend`); Redis URL in `.env.template` but not wired in minimal `medusa-config.ts`.
- Limit: Default config is DB + HTTP only — no explicit worker/cache modules in `apps/backend/medusa-config.ts`. Search and jobs may need Redis/workers for production load.
- Scaling path: Enable Medusa caching/event bus/Redis per Medusa ops docs; horizontal API with shared Postgres; separate worker processes for search ingest.

**Cart quantity UI:**
- Current capacity: Max 10 units per line in UI.
- Limit: Cannot sell higher qty without code change even if inventory allows.
- Scaling path: Inventory-driven max quantity.

## Dependencies at Risk

**@medusajs/\* 2.21.2 (auth coupling):**
- Risk: Storefront `@medusajs/js-sdk` auth API is the customer IdP. Supabase migration fights this dependency rather than wrapping it.
- Impact: Breaking Medusa auth upgrades or dual-auth increase support cost.
- Migration plan: Isolate auth behind an internal module; keep `@medusajs/js-sdk` for catalog/cart/order only.

**Stripe packages on storefront:**
- Risk: `@stripe/react-stripe-js` / `@stripe/stripe-js` require Medusa payment provider + env publishable keys; misconfig breaks checkout.
- Impact: Production checkout failure.
- Migration plan: Document required env keys in storefront `.env.example`; add payment e2e in test mode.

**lodash in storefront:**
- Risk: Full `lodash` dependency for potentially small helpers.
- Impact: Bundle weight.
- Migration plan: Replace with native utilities or `lodash-es` per-method imports where used.

**Node engine >=22.22.0:**
- Risk: Stricter than many host images still on Node 20.
- Impact: Deploy failures on older runtimes.
- Migration plan: Pin Node 22 in Docker/hosting; document in README.

**No lockfile-adjacent CI for audit:**
- Risk: `pnpm-lock.yaml` exists but no automated vulnerability scan.
- Impact: Known CVEs can ship unnoticed.
- Migration plan: CI `pnpm audit` + Dependabot/Renovate.

## Missing Critical Features

**Supabase (or non-Medusa) customer auth:**
- Problem: Not present; all customer auth is Medusa native.
- Blocks: Planned identity migration, social login via Supabase, unified auth with other Royal Fashion apps.

**Password reset / update:**
- Problem: No working storefront password change or forgot-password flow (stub only).
- Blocks: Account recovery and security hygiene.

**Automated test suite content:**
- Problem: Jest scripts and `integration-tests/setup.js` exist; zero `*.spec.ts` / `__tests__` files under `apps/`.
- Blocks: Safe refactors of auth, cart, and search.

**CI/CD pipeline:**
- Problem: No GitHub Actions (or equivalent) in repo.
- Blocks: Enforced quality gates and deploy confidence.

**Observability:**
- Problem: `apps/backend/instrumentation.ts` is fully commented; no Sentry (or similar) on storefront.
- Blocks: Production incident diagnosis.

**Storefront env template:**
- Problem: Backend has `.env.template`; storefront relies on `check-env-variables.js` for a subset only.
- Blocks: Consistent onboarding for `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, default region, Stripe keys.

## Test Coverage Gaps

**Customer auth (register / login / verify / logout / cart transfer):**
- What's not tested: Entire `apps/storefront/src/lib/data/customer.ts` flow and cookie side effects.
- Files: `apps/storefront/src/lib/data/customer.ts`, `apps/storefront/src/lib/data/cookies.ts`
- Risk: Supabase migration or Medusa auth upgrades break checkout silently.
- Priority: High

**Checkout + payment return:**
- What's not tested: Stripe confirm, payment-return route validation, `placeOrder`, cart cookie clear.
- Files: `apps/storefront/src/app/api/payment-return/route.ts`, `apps/storefront/src/lib/data/cart.ts`, `apps/storefront/src/modules/checkout/components/payment-button/index.tsx`
- Risk: Paid-but-unplaced orders or false payment_failed redirects.
- Priority: High

**Backend HTTP / module / unit tests:**
- What's not tested: Scripts exist (`test:unit`, `test:integration:http`, `test:integration:modules`) but no suites committed.
- Files: `apps/backend/package.json`, `apps/backend/jest.config.js`, `apps/backend/integration-tests/setup.js`
- Risk: Search helpers and custom routes regress without detection.
- Priority: High

**Search index transform / event coverage:**
- What's not tested: `toDocument`, pricing helpers, middleware allowlist.
- Files: `apps/backend/src/search/**/*.ts`, `apps/backend/src/api/middlewares.ts`
- Risk: Wrong facets/prices in storefront InstantSearch.
- Priority: Medium

**Account profile mutations:**
- What's not tested: Address CRUD, profile name/phone; email/password stubs.
- Files: `apps/storefront/src/modules/account/**/*`, `apps/storefront/src/lib/data/customer.ts`
- Risk: Silent no-ops (already true for email/password).
- Priority: Medium

**Storefront E2E:**
- What's not tested: No Playwright/Cypress (or similar) in storefront `package.json`.
- Files: `apps/storefront/package.json`
- Risk: Region middleware and locale routing regressions.
- Priority: Medium

---

*Concerns audit: 2026-10-08*
