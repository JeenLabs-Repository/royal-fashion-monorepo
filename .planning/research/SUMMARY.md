# Project Research Summary

**Project:** Royal Fashion — Supabase Auth Migration
**Domain:** Medusa 2 DTC monorepo auth cutover (Supabase Auth email/password → Medusa session bridge)
**Researched:** 2026-10-08
**Confidence:** MEDIUM

## Executive Summary

This milestone is a brownfield auth cutover on an existing Medusa 2.21 + Next.js 15 DTC monorepo: Supabase Auth becomes the sole email/password credential store for storefront customers and Medusa Admin operators, while Medusa remains the source of truth for commerce and admin actors (Customer, User, carts, orders). Experts build this as a **dual-session bridge** — identity proves via `@supabase/ssr` cookies, then a custom Medusa Auth Module Provider (`supabase`) verifies the Supabase access token, upserts `AuthIdentity`, links the correct actor (`customer` or `user`), and issues Medusa JWT/session so existing Store/Admin APIs keep working.

The recommended approach is opinionated and hard-cutover: pin current Medusa/Next versions; add `@supabase/supabase-js` + `@supabase/ssr` on the storefront and `jose` (or `auth.getUser`) on the backend; implement provider + workflows for token exchange; rewire `customer.ts` Server Actions and Admin login entry; preserve guest cart transfer after Medusa customer bind; then remove every `emailpass` path and Medusa-native verify/reset UI. Do not dual-run Medusa passwords, do not migrate password hashes, and do not authorize from editable `user_metadata` or expose `service_role` to the browser.

Key risks are mistaking a Supabase session for Store/Admin auth (broken `/customers/me`, lost carts), dual IdPs during “safe” fallback, SSR cookie/`getSession` mistakes, local-vs-prod email confirmation surprises, and Admin UI swap complexity. Mitigate with a single post-auth pipeline (Supabase → verify → actor link → Medusa credential → cart transfer), env-boundary CI, explicit confirmation policy in `config.toml`, separate customer vs admin link workflows, and a dedicated Admin login spike before hard-removing native password login.

## Key Findings

### Recommended Stack

Stay on pinned monorepo versions; add only Supabase identity clients and JWT verification. Credentials never enter Medusa; Medusa Auth Module still issues actor sessions after token proof. Details: [STACK.md](./STACK.md).

**Core technologies:**
- Medusa Auth Module + custom `supabase` provider (`@medusajs/*` **2.21.2**) — sole actor session issuer; `authMethodsPerActor` lists only `supabase` for `customer` and `user`
- `@supabase/supabase-js` **2.117.3** + `@supabase/ssr` **0.12.7** — email/password, confirm, reset, SSR cookie/PKCE on Next.js 15 storefront
- `@medusajs/js-sdk` **2.21.2** — Store/Admin commerce after bridge (`sdk.auth.login(..., "supabase", { access_token })`); keep `_medusa_jwt`
- `jose` **6.2.12** (JWKS) or backend `auth.getUser(jwt)` — verify Supabase tokens on Medusa (prefer `getUser` for local HS256)
- Self-hosted Supabase CLI **2.120.0** + Docker — local Auth at `http://127.0.0.1:54321`

**Critical version / env rules:** Node `>=22.22.0` (existing); do not bump Medusa in this milestone; never put service-role in `NEXT_PUBLIC_*`; keep Medusa `JWT_SECRET` / `COOKIE_SECRET` separate from Supabase secrets.

### Expected Features

v1 success = Supabase-only register/login/logout/verify/reset for customers and Admin, with Medusa actors linked and zero Medusa password entry points. Details: [FEATURES.md](./FEATURES.md).

**Must have (table stakes):**
- Customer register/login/logout via Supabase email/password
- Email verification + confirm route (PKCE / `verifyOtp`) with local/prod confirm policy pinned
- Password reset request + set-new-password via Supabase
- Durable SSR sessions (`@supabase/ssr`); authorize with `getUser()`
- Medusa customer find-or-create/link + Store API auth bridge (`_medusa_jwt` or equivalent)
- Guest cart → authenticated cart transfer after bind
- Admin Supabase login + Medusa `user` actor session
- Full removal of Medusa `emailpass` / native verify-reset; cutover messaging (no hash migration); env/runbook

**Should have (competitive / v1.x):**
- Explicit `supabase_user_id` map + `app_metadata` roles
- In-account password change (`updateUser`); resend verification
- Auth cutover kill-switch / traffic proof; automated register/verify/login/transfer/admin tests

**Defer (v2+):**
- OAuth / social / magic-link / 2FA
- Password hash migration tooling
- Verified email-change across IdP + Medusa; multi-app Royal Fashion IdP

### Architecture Approach

Dual-session trust boundary: Supabase cookies prove identity; Medusa JWT/session authorizes Store/Admin. Custom Auth provider validates access tokens (not passwords); workflows ensure Customer/User actors and `app_metadata.customer_id` / `user_id`. Separate Supabase Auth DB from Medusa commerce Postgres. Details: [ARCHITECTURE.md](./ARCHITECTURE.md).

**Major components:**
1. Self-hosted Supabase Auth — sole credential store (password, verify, reset, tokens)
2. Storefront `@supabase/ssr` + Server Actions — identity UX; then Medusa exchange + `transferCart`
3. Medusa `supabase` Auth Module Provider + link workflows — JWT verify, AuthIdentity upsert, actor bind
4. Store/Admin APIs (unchanged once actor present) — SDK + publishable key / Admin session
5. Custom Admin login entry — Supabase sign-in → `user` exchange → Medusa session cookie

### Critical Pitfalls

Top risks from [PITFALLS.md](./PITFALLS.md):

1. **Supabase login ≠ Medusa customer auth** — Always complete actor link + Medusa credential before marking login success; then `transferCart`.
2. **Dual-running `emailpass` + Supabase** — Hard cutover; no fallback; invalidate old `_medusa_jwt`; force reset/re-register messaging.
3. **Service-role leakage into storefront** — Publishable/anon client-only; privileged ops on Medusa backend; CI deny `NEXT_PUBLIC_*SERVICE*`.
4. **SSR cookie mistakes (`getSession` as authz)** — Use `@supabase/ssr`; authorize with `getUser()`; compose middleware refresh carefully.
5. **Admin treated like customer auth** — Separate `user` pipeline; never grant admin by email alone; plan custom Admin login + CORS.

## Implications for Roadmap

Based on research, suggested phase structure (dependency-driven; do not invert 1–4):

### Phase 1: Supabase Local + SSR Foundation
**Rationale:** Nothing authenticates without Auth host, env boundaries, and cookie clients.
**Delivers:** Local Supabase (`127.0.0.1:54321`), env templates, `@supabase/ssr` clients, middleware refresh composed with region middleware, claims policy (`app_metadata` only for roles).
**Addresses:** Env + local runbook (partial); durable SSR session foundation.
**Avoids:** Service-role leakage; `getSession` authz; merged Supabase/Medusa Postgres.

### Phase 2: Storefront Supabase Identity UX
**Rationale:** Shoppers must register/login/logout/verify/reset on Supabase before commerce rewiring completes.
**Delivers:** Server Actions for `signUp` / `signInWithPassword` / `signOut` / reset; shared `/auth/confirm` for email + recovery; drop Medusa verify-reset UX; disable lying profile password/email stubs.
**Uses:** `@supabase/supabase-js`, `@supabase/ssr`, Mailpit/Inbucket for local email.
**Implements:** Storefront auth Server Actions + confirm/reset pages.
**Avoids:** Confirm/reset redirect and local-vs-prod confirmation surprises; dual verify UIs.

### Phase 3: Medusa Customer Bridge + Cart Transfer
**Rationale:** Commerce APIs need Customer actor + Store credential; cart transfer depends on customer-bound headers.
**Delivers:** Custom `supabase` Auth provider `authenticate`; customer exchange workflow; `sdk.auth.login("customer","supabase",…)`; `_medusa_jwt` persist; retrieve-or-create customer; `transferCart` after bind; integration tests for guest→login cart.
**Addresses:** Medusa customer link; Store API auth bridge; guest cart transfer.
**Avoids:** Treating Supabase session as enough; cart transfer omitted/wrong order; empty auth-header checks.

### Phase 4: Admin Supabase Login + User Actor
**Rationale:** Harder surface; prove store pattern first; Admin uses session auth and actor type `user`.
**Delivers:** Admin User provision/link workflow; custom Admin login UI → Supabase → `/auth/user/supabase` → Medusa session; `ADMIN_CORS` / `AUTH_CORS` correct; customer cannot open `/app`.
**Addresses:** Admin login + Medusa admin user link/session.
**Avoids:** Admin≈customer conflation; admin-by-email alone; `user_metadata` roles.

### Phase 5: Hard Cutover — Remove Medusa Password Auth
**Rationale:** Milestone success metric forbids dual IdP; only safe after store + Admin bridges work.
**Delivers:** Remove `emailpass` from Auth module / `authMethodsPerActor`; grep-clean storefront + backend; invalidate old JWTs (cookie clear ± `JWT_SECRET` rotate); cutover messaging for existing users.
**Addresses:** Full removal of Medusa password paths; existing-user messaging.
**Avoids:** Dual-run fallback; orphan `_medusa_jwt`; leftover verify-account routes.

### Phase 6: Hardening, Tests, Runbook Completion
**Rationale:** Operability and regression safety before calling the milestone done.
**Delivers:** Complete env/runbook; CORS/secret boot checks; optional kill-switch metrics; P2 auth e2e (register/verify/login/transfer/admin); `app_metadata` review.
**Addresses:** Env/runbook completeness; auth automated tests (v1.x); kill-switch (v1.x).
**Avoids:** Template JWT secrets; cache-tag staleness; undocumented confirm policy drift.

### Phase Ordering Rationale

- Auth host + SSR cookies before any UI cutover (Phases 1–2).
- Customer actor bridge + cart before Admin (Phase 3 before 4) — highest conversion risk first, reuse bridge pattern.
- Removal of `emailpass` only after both bridges live (Phase 5) — avoids locking operators out.
- Docs/tests/hardening last (Phase 6) — prove green paths, then freeze dual-auth risk window closed.
- Architecture anti-patterns (logic in routes, merged DBs, service-role in Next) are phase gates, not later cleanup.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Exact Medusa 2.21 token-exchange / custom provider payload shape and Store JWT minting after external IdP — spike against Auth Module Provider docs + in-repo `completeLogin`.
- **Phase 4:** Admin dashboard login replacement vs custom Admin UI route / session establishment against `@medusajs/dashboard` — highest uncertainty (MEDIUM across all research files).

Phases with standard patterns (skip research-phase):
- **Phase 1:** Supabase SSR Next.js cookie clients — well-documented official path.
- **Phase 2:** Supabase password + confirm/reset flows — official passwords/sessions docs.
- **Phase 5:** Grep-clean + config removal — mechanical once bridges proven.
- **Phase 6:** Env/CORS/docs — project conventions; spot-check only.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Official Medusa + Supabase docs + npm pins; no first-party Medusa↔Supabase reference impl |
| Features | MEDIUM | Strong PROJECT + docs alignment; bridge mechanism details owned by architecture |
| Architecture | HIGH (store) / MEDIUM (Admin) | Dual-session + customer link HIGH from codebase; Admin UI swap MEDIUM pending spike |
| Pitfalls | MEDIUM–HIGH | Brownfield storefront/cart coupling HIGH; SSR/security via docs/skills MEDIUM |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Medusa Store/Admin credential mint after external IdP:** Confirm provider `authenticate` body (`access_token`) vs optional thin routes during Phase 3/4 planning — prefer Auth Module Provider (STACK/ARCHITECTURE recommendation).
- **Admin login UI mechanics:** Spike custom Admin route vs dashboard override before locking Phase 4 tasks.
- **Production Supabase host:** Out of scope beyond env-ready config; keep packages env-swappable (JWKS path for hosted asymmetric keys).
- **Same email across customer vs admin actors:** Decide allow vs deny policy early (FEATURES/PITFALLS flag Medusa collision risk).
- **Storefront test gap:** Zero storefront tests today — plan Phase 6 (or late Phase 3/4) e2e before production cutover.

## Sources

### Primary (HIGH confidence)
- Project: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `STACK.md`, `INTEGRATIONS.md`
- Live code: `apps/storefront/src/lib/data/customer.ts`, `cookies.ts`
- Medusa — Auth Identity & Actor Types; Authentication Flows; Storefront Login; Third-Party Login
- Supabase — SSR creating-a-client; passwords; sessions (via docs/MCP)

### Secondary (MEDIUM confidence)
- Medusa — Auth Module Provider / How to Create an Auth Module Provider; JS SDK auth overview
- Medusa skills — `building-with-medusa` authentication; Admin SDK session (`building-admin-dashboard-customizations`)
- Supabase — JWTs (jose/JWKS vs HS256 `getUser`); local CLI; migrating from Auth Helpers
- Supabase skill security checklist — service role, `user_metadata` vs `app_metadata`
- npm registry (2026-10-08) — `@supabase/supabase-js@2.117.3`, `@supabase/ssr@0.12.7`, `jose@6.2.12`, `supabase@2.120.0`

### Tertiary (LOW confidence)
- Exact Admin dashboard login surface for Medusa 2.21 — needs Phase 4 spike
- Production-hosted Supabase key naming timeline (`sb_publishable_` / `sb_secret_`) — env-document only for v1

---
*Research completed: 2026-10-08*
*Ready for roadmap: yes*
