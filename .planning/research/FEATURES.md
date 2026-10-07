# Feature Research

**Domain:** Medusa DTC commerce — Supabase-only email/password auth cutover (storefront customers + Medusa Admin)
**Researched:** 2026-10-08
**Confidence:** MEDIUM (official Supabase Auth + Medusa Auth docs cross-checked with brownfield PROJECT/ARCHITECTURE/CONCERNS; seam classify-confidence = MEDIUM)

## Feature Landscape

v1 mandate (from PROJECT.md): Supabase Auth is the **only** credential store for email/password; Medusa keeps commerce actors (Customer / Admin `user`); no OAuth; no password-hash import. Expected end-state UX mirrors today’s storefront register → verify → login → cart transfer, plus Admin login that yields a usable Medusa admin actor — without any remaining Medusa `emailpass` entry points.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = cutover feels broken / operators cannot work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Customer register (email + password) | Shoppers expect account creation before orders/profile | MEDIUM | Use Supabase `signUp`; collect profile fields (name/phone) server-side for later Medusa `customer.create`. Do not call `sdk.auth.register("customer","emailpass")`. |
| Customer login (email + password) | Core account access | MEDIUM | Supabase `signInWithPassword`; then bind Medusa customer actor + Store API auth. Replace `completeLogin` / `_medusa_jwt` path. |
| Email verification / confirm | Users expect “check your email” when confirmations enabled; production hosted Supabase defaults confirmations **on** | HIGH | PKCE + `/auth/confirm` exchanging `token_hash` via `verifyOtp` (`type=email`). Local self-hosted often has confirmations **off** — configure explicitly so dev ≠ prod surprise. Gate “logged-in commerce” until confirmed if policy requires it. |
| Password reset (request + set new) | Account recovery is table-stakes; storefront password change is currently a stub | MEDIUM | `resetPasswordForEmail` (no email enumeration) → recovery link → confirm (`type=recovery`) → authenticated `updateUser({ password })` page. Drop Medusa `updateProvider` / native reset UI. |
| Logout + session clear | Users expect sign-out to end access on this device | MEDIUM | Supabase `signOut` + clear storefront cookies/cache tags; also invalidate any Medusa-scoped token/session issued after link. |
| Durable session (refresh across navigations) | Returning shoppers stay signed in | HIGH | Next.js SSR via `@supabase/ssr` cookie clients; prefer `getUser()` for auth decisions. Access JWT short-lived; refresh token rotation. Keep `sameSite: "lax"` semantics where payment redirects need cookies. |
| Medusa customer create/link after Supabase auth | Commerce APIs need a Customer actor — identity ≠ cart/orders | HIGH | After Supabase session: find-or-create Medusa customer by email and/or stored `supabase_user_id`; ensure subsequent `/store/customers/me/*` calls succeed. Mirrors today’s retrieve-or-`customer.create` step. |
| Store API customer-scoped auth bridge | Logged-in cart, addresses, orders require authenticated Store calls | HIGH | Today ~29 call sites use `_medusa_jwt` via `getAuthHeaders`. Cutover must supply an equivalent Medusa customer credential/session after Supabase login — not “Supabase session alone.” Exact mechanism is architecture-owned; feature requirement is: authenticated Store operations keep working. |
| Guest cart → authenticated cart transfer | Losing cart on login is a conversion killer | MEDIUM | Preserve `transferCart()` after successful bind; keep `_medusa_cart_id` contract. |
| Admin login (email + password via Supabase) | Operators must reach `/app` without Medusa-native passwords | HIGH | Replace Admin emailpass login UI/entry with Supabase credentials; then establish Medusa `user` actor session (Admin SDK uses `auth.type: "session"`). |
| Admin user create/link from Supabase identity | Admin routes require `authenticate("user", …)` / `req.auth_context.actor_id` | HIGH | Pre-provision or invite Medusa admin users; link `supabase_user_id` ↔ Medusa `user_id` (and/or email). Distinct actor type from `customer` — do not conflate. |
| Full removal of Medusa password auth paths | Success metric: zero remaining Medusa password entry | MEDIUM | Remove storefront `sdk.auth.*` emailpass, pending-customer cookie as IdP, Admin native password login, Medusa verification/reset UX. No silent fallback. |
| Existing-user cutover messaging (no hash migration) | Staging/early users cannot keep old passwords | LOW | Force re-register or “reset via Supabase email” communications; invalidate old `_medusa_jwt`. |
| Env + local runbook (self-hosted Supabase) | Team cannot operate cutover without it | LOW | Document `127.0.0.1:54321`, publishable vs service-role keys, redirect URLs, confirmation toggles, Admin + storefront env. |

### Differentiators (Competitive Advantage)

Not required for “auth works,” but valuable for this migration’s quality and future Royal Fashion IdP reuse.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Explicit IdP↔commerce ID map | Stable link when email changes later; auditability | MEDIUM | Persist `supabase_user_id` on Medusa customer/user metadata (or link table). Prefer `app_metadata` on Supabase for role claims — never authorize from editable `user_metadata`. |
| Actor role separation (customer vs admin) in Supabase | Prevents shopper JWT from becoming admin | MEDIUM | Encode intended actor in Supabase `app_metadata` (e.g. `role: customer|admin`); enforce at Medusa bridge. Same email across actors is a known Medusa pitfall — decide allow vs deny. |
| In-account password change (authenticated) | Fixes stubbed `ProfilePassword`; builds trust | LOW | Logged-in `updateUser({ password })` — separate from forgot-password recovery. |
| Resend verification email | Reduces support tickets when confirmations on | LOW | Supabase resend APIs + clear UI state (`verification_required`). |
| Shared `/auth/confirm` for email + recovery | One PKCE exchange path; fewer bugs | MEDIUM | Route handles `type=email` and `type=recovery` (and errors → auth-code-error page). |
| Auth cutover kill-switch / feature flag | Safe deploy; prove zero Medusa password traffic | MEDIUM | Config that rejects Medusa emailpass even if code paths remain briefly during rollout. |
| Admin bootstrap / invite-then-link runbook | Operators can create first admin without chicken-and-egg | MEDIUM | Document: create Medusa user (invite/accept or seed) + create matching Supabase user + link. Out of scope: rebuilding Admin product UI. |
| Auth integration tests (register/verify/login/transfer/admin) | CONCERNS: zero storefront tests today — migration risk | MEDIUM | HTTP/e2e covering customer + admin happy paths and collision errors. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OAuth / social / magic-link / OTP passwordless / 2FA | “Modern auth” | Explicitly out of scope for v1; expands redirect, provider, and Admin surface | Email/password only; revisit after cutover stable |
| Migrate Medusa password hashes into Supabase | Avoid re-onboarding users | Out of scope; crypto/format mismatch; dual-truth risk | Force reset / re-register; communicate clearly |
| Dual-run Medusa emailpass + Supabase | Safer rollback story | Orphan identities, replayable JWTs, linking collisions (already flagged in CONCERNS) | Hard cutover + kill-switch; keep rollback as redeploy previous commit, not dual login |
| Browser-exposed `service_role` / secret keys | Easier admin linking from client | Full privilege bypass; catastrophic if leaked | Server-only service role; publishable key in storefront |
| Authorize via Supabase `user_metadata` | Convenient custom claims | User-editable; unsafe for RLS/role decisions | Use `app_metadata` / server-side role maps |
| Commerce without Medusa customer/admin actor | “Just use Supabase JWT on Store API” | Store `/customers/me` and Admin APIs expect Medusa actors | Always create/link Medusa customer/user after Supabase auth |
| Keep Medusa-native verify/reset UI alongside Supabase | Familiar screens | Dual email templates, dual tokens, support confusion | Supabase templates + storefront pages only |
| Fake profile email “success” / half Medusa password update | Looks complete | Trust damage (already a known bug/stub) | Disable until IdP-backed email change; implement password via Supabase |
| Rebuild Admin dashboard product features | While touching Admin login | Scope creep; PROJECT forbids | Only replace login/identity path |
| Silent auto-merge customer↔admin same email | Convenience for staff shopping | Auth identity collisions; privilege confusion | Explicit policy: separate accounts or deliberate dual-actor linking with checks |

## Feature Dependencies

```
Local Supabase env + redirect URL config
    └──requires──> Customer register / login
                       └──requires──> Email confirm route (when confirmations enabled)
                       └──requires──> Medusa customer create/link
                                          └──requires──> Store API auth bridge
                                                 └──requires──> Guest cart transfer
                                                 └──enhances──> Account parallel routes (dashboard vs login)

Customer login
    └──requires──> Durable Supabase session (SSR cookies + refresh)

Password reset request
    └──requires──> Confirm route (type=recovery)
                       └──requires──> Authenticated update password page

Admin Supabase login
    └──requires──> Medusa admin user provision/link
                       └──requires──> Medusa admin session establishment
                              └──conflicts──> Leaving Medusa emailpass Admin login enabled

Full Medusa password-path removal
    └──requires──> Customer bridge + Admin bridge both live
    └──conflicts──> Dual-run / fallback emailpass

In-account password change ──enhances──> Customer session (authenticated updateUser)
Auth tests ──enhances──> All table-stakes flows
```

### Dependency Notes

- **Store bridge requires customer link:** A Supabase session without a Medusa customer leaves cart/orders/profile broken (today’s retrieve-or-create lesson).
- **Cart transfer requires authenticated Store customer:** Transfer after bind, not after IdP-only login.
- **Admin session requires Medusa `user` actor:** Supabase login alone does not open `/admin/*`.
- **Confirmations config couples verify UX:** Enabling confirmations without `/auth/confirm` + email templates blocks signup completion.
- **Removal conflicts with dual-run:** PROJECT success metric forbids leaving Medusa password as fallback.

## MVP Definition

### Launch With (v1)

Minimum for “Supabase-only auth cutover” success metric.

- [ ] Customer register + login + logout via Supabase email/password — credential source of truth
- [ ] Email verification path (confirm route + templates) configurable for local/prod — matches Supabase model
- [ ] Password reset request + set-new-password via Supabase — replaces missing/stub recovery
- [ ] Durable SSR session cookies (`@supabase/ssr`) — no password in cookies; httpOnly session
- [ ] Medusa customer find-or-create/link + Store API auth bridge — commerce still customer-scoped
- [ ] Guest cart transfer after successful bind — preserve checkout continuity
- [ ] Admin Supabase email/password login + Medusa admin user link/session — operators can work
- [ ] Remove all Medusa `emailpass` / native password entry points — no dual auth
- [ ] Existing-user force reset/re-register messaging — no hash migration
- [ ] Env + local self-hosted Supabase runbook — operable milestone

### Add After Validation (v1.x)

- [ ] In-account password change UI wired to `updateUser` — trigger: profile stub removal
- [ ] Resend verification email — trigger: confirmations enabled in staging/prod
- [ ] Explicit `supabase_user_id` mapping + app_metadata roles — trigger: email-change or multi-app IdP
- [ ] Auth cutover kill-switch metrics — trigger: production deploy
- [ ] Automated register/verify/login/transfer/admin tests — trigger: before production cutover

### Future Consideration (v2+)

- [ ] OAuth / social / magic link — why defer: PROJECT out of scope
- [ ] Password hash migration tooling — why defer: early/staging; force reset cheaper
- [ ] 2FA / session time-box / single-session policies — why defer: Pro-plan session controls; not v1
- [ ] Verified email-change flow (IdP + Medusa customer email) — why defer: current UI is fake-success; design carefully
- [ ] Unified Royal Fashion IdP across non-Medusa apps — why defer: after this cutover proves bridge pattern

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Customer register/login/logout (Supabase) | HIGH | MEDIUM | P1 |
| Email verification + confirm route | HIGH | HIGH | P1 |
| Password reset + update password | HIGH | MEDIUM | P1 |
| SSR session cookies + refresh | HIGH | HIGH | P1 |
| Medusa customer link | HIGH | HIGH | P1 |
| Store API auth bridge | HIGH | HIGH | P1 |
| Guest cart transfer | HIGH | MEDIUM | P1 |
| Admin Supabase login + Medusa user session | HIGH | HIGH | P1 |
| Remove Medusa emailpass paths | HIGH | MEDIUM | P1 |
| Cutover messaging (no hash migration) | MEDIUM | LOW | P1 |
| Env/runbook | MEDIUM | LOW | P1 |
| In-account password change | MEDIUM | LOW | P2 |
| Resend verification | MEDIUM | LOW | P2 |
| Explicit ID map + app_metadata roles | MEDIUM | MEDIUM | P2 |
| Auth automated tests | HIGH | MEDIUM | P2 |
| Kill-switch / traffic proof | MEDIUM | MEDIUM | P2 |
| OAuth / magic link / 2FA | MEDIUM | HIGH | P3 |
| Password hash migration | LOW | HIGH | P3 |
| Verified email change | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Typical Medusa storefront (native emailpass) | Typical Supabase-auth app | Our Approach |
|---------|-----------------------------------------------|---------------------------|--------------|
| Register / login | Medusa Auth routes + JWT/session | `signUp` / `signInWithPassword` | Supabase credentials only |
| Email verify | Medusa verification_required branch | Confirm email + PKCE `verifyOtp` | Supabase-only templates + confirm route |
| Password reset | Medusa auth provider update | `resetPasswordForEmail` + `updateUser` | Supabase-only; fix current stub |
| Commerce actor | AuthIdentity → Customer create | Auto user row in `auth.users` only | Supabase user **plus** Medusa customer/admin link |
| Admin login | Medusa Admin emailpass / session | Separate admin app or RLS roles | Supabase login **then** Medusa `user` session |
| Social login | Optional third-party providers | Built-in OAuth | Deferred (anti-feature for v1) |

## Sources

- PROJECT.md — validated/active requirements, out-of-scope, success metric (2026-10-08)
- `.planning/codebase/ARCHITECTURE.md` — current customer auth/cart transfer cookie flow
- `.planning/codebase/CONCERNS.md` — auth migration attack surface, password stub, test gaps
- Supabase Auth passwords guide — https://supabase.com/docs/guides/auth/passwords (signUp, signInWithPassword, resetPasswordForEmail, updateUser, confirmations defaults)
- Supabase sessions guide — https://supabase.com/docs/guides/auth/sessions (JWT + refresh, sign-out semantics)
- Supabase SSR Next.js guide — https://supabase.com/docs/guides/auth/server-side/nextjs (`@supabase/ssr` cookies)
- Supabase skill security checklist — `user_metadata` vs `app_metadata`; never expose service_role
- Medusa Auth identity & actor types — https://docs.medusajs.com/resources/commerce-modules/auth/auth-identity-and-actor-types
- Medusa authentication routes — https://docs.medusajs.com/resources/commerce-modules/auth/authentication-route (register → create actor → login)
- Medusa auth flows — https://docs.medusajs.com/resources/commerce-modules/auth/auth-flows (emailpass register/authenticate; password updateProvider — to be removed)
- Medusa storefront login — https://docs.medusajs.com/resources/storefront-development/customers/login (JWT vs session)
- Medusa skills — customer vs `user` actor; Admin SDK `auth.type: "session"`

### Confidence notes

| Claim area | Confidence | Basis |
|------------|------------|-------|
| Supabase email/password feature set | MEDIUM→HIGH | Official passwords + sessions + SSR docs (curl `.md`); classify-confidence MEDIUM |
| Medusa identity vs actor split | MEDIUM→HIGH | Official Medusa auth-identity + authentication-route docs |
| Exact Medusa Store/Admin bridge mechanism after Supabase | MEDIUM | Required by architecture; implementation options owned by stack/architecture research |
| Admin custom login replacement details | MEDIUM | Need phase research for Admin UI override vs reverse-proxy vs custom auth provider |

---
*Feature research for: Medusa + Supabase Auth cutover (customers + Admin)*
*Researched: 2026-10-08*
