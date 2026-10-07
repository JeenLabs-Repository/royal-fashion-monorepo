# Pitfalls Research

**Domain:** Medusa 2 DTC + self-hosted Supabase Auth cutover (email/password)
**Researched:** 2026-10-08
**Confidence:** MEDIUM (HIGH for brownfield storefront/auth coupling; MEDIUM for Supabase SSR/security docs via MCP + skills)

## Critical Pitfalls

### Pitfall 1: Treating Supabase login as Medusa customer auth

**What goes wrong:**
Shopper signs in with Supabase, storefront shows “logged in,” but `/store/customers/me`, orders, addresses, and cart ownership still fail or behave as guest. Checkout after login drops the guest cart or cannot attach the customer.

**Why it happens:**
Medusa separates **auth identity** from the **customer actor**. Today’s `completeLogin` path already shows this: after `emailpass` token, retrieve-or-create customer, sometimes re-login, then `transferCart`. Teams replace only `sdk.auth.login` and forget the actor-binding step once passwords leave Medusa.

**How to avoid:**
Define a single post-auth pipeline: Supabase session verified → resolve/create Medusa customer by email (and store `supabase_user_id` in metadata) → mint/attach whatever Medusa-scoped credential the Store API still requires → **then** `transferCart`. Never mark login success until customer actor + cart transfer succeed (or soft-fail cart with explicit UX).

**Warning signs:**
- UI authenticated but `retrieveCustomer` returns null
- Orders empty for known customers
- Guest cart items vanish after login without transfer errors
- New code paths that set only Supabase cookies and leave `_medusa_jwt` unset without a replacement Store auth strategy

**Phase to address:**
Phase 3 — Medusa customer linking + cart transfer (depends on Phase 2 Supabase storefront auth)

---

### Pitfall 2: Dual-running Medusa `emailpass` and Supabase (no hard cutover)

**What goes wrong:**
Two password systems accept login. Users reset on one IdP and fail on the other. Orphan `_medusa_jwt` cookies keep working after “migration.” Email collisions hit Medusa’s existing `"Identity with email already exists"` branch. Support cannot tell which system owns credentials.

**Why it happens:**
Leaving Medusa auth as a “fallback” feels safer. PROJECT.md forbids password hash import in v1, so dual systems create permanent ambiguity.

**How to avoid:**
Freeze Medusa password login before/with Supabase go-live: remove storefront `sdk.auth.register/login/verification` and Admin native password entry. Invalidate `_medusa_jwt` on cutover (clear cookie + rotate `JWT_SECRET` if any Medusa-issued tokens remain in the design). Document forced re-register/reset for existing users (no hash migration).

**Warning signs:**
- Grep still finds `emailpass` or `sdk.auth.login("customer"` after “done”
- Both Medusa verify-account UI and Supabase confirm emails exist
- Users report “wrong password” after resetting via the other system

**Phase to address:**
Phase 5 — Remove Medusa-native auth paths (gate after storefront + admin Supabase paths work)

---

### Pitfall 3: Service-role / secret key leakage into the storefront

**What goes wrong:**
`service_role` (or secret key) lands in `NEXT_PUBLIC_*`, client bundles, or browser-callable Server Actions. Attackers list users, confirm emails, impersonate, or bypass intended link logic.

**Why it happens:**
Customer create/link and Admin user provisioning need privileged Medusa/Supabase calls. Developers put the powerful key in the Next app for convenience. Supabase skill: never expose `service_role` in public clients; anything `NEXT_PUBLIC_` is browser-visible.

**How to avoid:**
Browser and RSC use publishable/anon + user session only. Privileged link/create flows run on Medusa backend (or a locked server-only module) with service role / admin API keys that never ship to the storefront. Lint/CI deny `SERVICE_ROLE` / `service_role` under `NEXT_PUBLIC_`. Prefer Medusa workflows for mutations that bind actors.

**Warning signs:**
- Env names like `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE`
- Storefront importing a Supabase admin client
- Browser network tab shows admin Auth API calls

**Phase to address:**
Phase 1 — Supabase clients, env boundaries, and auth adapter scaffolding

---

### Pitfall 4: SSR cookie mistakes (`getSession` as authz, missing `@supabase/ssr`)

**What goes wrong:**
Auth works in client components but Server Actions/RSC see no user (or vice versa). Or worse: authorization trusts cookie-parsed session without server validation. Middleware and Server Actions disagree on login state → flash of wrong account UI, stale cache tags.

**Why it happens:**
Default Supabase browser client uses localStorage; Next App Router needs cookie storage + PKCE via `@supabase/ssr`. Official JS reference warns: `getSession()` can load unauthentic values from cookie storage — use `getUser()` for authorization decisions.

**How to avoid:**
Use `@supabase/ssr` cookie clients for middleware, Server Components, and Server Actions. Authorize with `getUser()` (or validated JWT claims), not raw `getSession()`. Align cookie `sameSite` with payment return (`lax` already required for Stripe-like redirects). Refresh session in middleware so RSC and actions share one session story. Keep `_medusa_cache_id` revalidation tied to the new session identity.

**Warning signs:**
- Console warnings about `getSession` + cookie storage
- Login works client-side only
- Intermittent “not logged in” on hard refresh
- Account pages show wrong customer after switch-user without full cookie clear

**Phase to address:**
Phase 1 — SSR session foundation; verified again in Phase 2 storefront flows

---

### Pitfall 5: Email confirm / reset UX broken by local vs hosted defaults and redirects

**What goes wrong:**
Local signup “just works” without confirm; staging/production suddenly blocks unverified users. Confirm/reset links 404 or open wrong app. Cross-device verify loses pending profile fields (today’s `_medusa_pending_customer` already only lives on the signup device).

**Why it happens:**
Supabase docs: hosted projects often require email confirmation by default; **self-hosted / local often have confirmation false**. Redirect destinations must be allowlisted (`site_url` + additional redirect URLs in `config.toml` / URL configuration). Teams keep Medusa verify-account pages while Supabase emails point elsewhere.

**How to avoid:**
Pin `enable_confirmations` (or equivalent) explicitly in local `config.toml` to match target prod policy. Configure storefront callback routes for confirm + recovery; allowlist every env origin. Replace Medusa verification/reset UI with Supabase flows end-to-end. Do not store signup PII only in a device cookie — persist pending profile server-side keyed by Supabase user id after signup, or collect names post-confirm.

**Warning signs:**
- Confirm emails never arrive locally (not checking Inbucket) or arrive but redirect to `localhost` wrong port
- Prod users stuck “check your email” with no Medusa/Supabase alignment
- Profile first/last name empty after verify-on-other-device

**Phase to address:**
Phase 2 — Storefront Supabase register/verify/reset; Phase 6 — env/runbook parity checks

---

### Pitfall 6: Admin Auth treated like customer Auth

**What goes wrong:**
Admins can sign into Supabase but Medusa Admin (`/app`) still expects Medusa `user` actor / session. Or worse: customer Supabase users gain admin by sharing the same linking code. CORS/auth cookie domains block Admin login while storefront works.

**Why it happens:**
Medusa Admin uses actor type `user` (not `customer`), with session/bearer/API key and `ADMIN_CORS` / `AUTH_CORS`. Customer linking logic must not be reused for privilege. Replacing only storefront leaves `medusa user` password login as a second IdP.

**How to avoid:**
Separate pipelines: Supabase user → Medusa **customer** vs Supabase user → Medusa **admin user**, with role/claims from `app_metadata` (not `user_metadata`). Never grant admin from email match alone. Plan Admin session establishment explicitly (custom auth provider / token exchange / controlled invite). Fix `ADMIN_CORS`, `AUTH_CORS`, cookie domains for Admin origin. Keep at least one break-glass admin path during cutover tests, then remove Medusa password login.

**Warning signs:**
- Storefront auth green, `/app` still on Medusa password form
- 401s on `/admin/*` after Supabase admin login
- Customer email can open Admin after naïve link-by-email

**Phase to address:**
Phase 4 — Admin Supabase auth + Medusa admin actor binding

---

### Pitfall 7: Cart transfer omitted or ordered wrong after IdP swap

**What goes wrong:**
Logged-in shoppers lose guest cart; abandoned carts inflate; support tickets spike after “auth rewrite.”

**Why it happens:**
Transfer is a late step in `completeLogin` and silently depends on `getAuthHeaders()` already carrying a **customer-bound** token. New Supabase flow often returns success before transfer, or transfers with empty auth headers (same class of bug as truthy `{}` from `getAuthHeaders`).

**How to avoid:**
Keep transfer as an explicit, tested step after Medusa customer auth headers exist. Fail closed with user-visible retry if transfer errors. Integration/e2e: guest add-to-cart → Supabase login → cart line items preserved. Fix auth-header emptiness checks (`"authorization" in headers`) during migration.

**Warning signs:**
- Transfer only in old `customer.ts`, not in new adapter
- Cart cookie present but `transferCart` never called
- Errors swallowed in empty `catch`

**Phase to address:**
Phase 3 — Customer link + cart transfer

---

### Pitfall 8: Authorizing with editable JWT metadata / stale claims

**What goes wrong:**
Users escalate to admin or skip verification by editing `user_metadata`. Or `app_metadata` role changes do not take effect until refresh, leaving stale privileges.

**Why it happens:**
Supabase skill: `raw_user_meta_data` / `user_metadata` is user-editable and can appear in JWTs — unsafe for RLS or authz. Claims are not always fresh until token refresh. Deleting a user does not invalidate existing access tokens.

**How to avoid:**
Store role and link ids in `app_metadata` (service-role only writes). Prefer server-side Medusa actor checks for commerce authorization, not Supabase metadata alone. Short access-token expiry for sensitive admin; revoke sessions on password change / cutover; on user delete, revoke sessions first.

**Warning signs:**
- RLS or link logic reads `auth.jwt() -> user_metadata`
- Admin flag settable from client `updateUser`
- Disabled users still call Store/Admin APIs until JWT expires

**Phase to address:**
Phase 1 (claims policy) and Phase 4 (admin roles); session revoke in Phase 5 cutover

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep Medusa `emailpass` as fallback | Faster “demo login” | Dual IdP forever; collision bugs | Never for this milestone |
| Put service role in Next Server Actions “only” | Quick customer create | Key leak via RSC/client boundaries | Never in storefront app |
| Trust `getSession()` in middleware | Fewer Auth round-trips | Spoofable cookie session | Never for authz |
| Pending profile only in cookie | Matches current starter | Cross-device verify loses PII | MVP only if confirm-same-device enforced |
| Skip Admin cutover “until later” | Ship storefront first | Two admin IdPs; security hole | Only if Phase 4 is sequential and Medusa admin locked to VPN — still must finish this milestone |
| Leave `_medusa_jwt` name after meaning changes | Fewer cookie renames | Confusion + stale clients | Acceptable briefly with migration clear; prefer rename or dual-clear |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth (SSR) | Browser client + localStorage in App Router | `@supabase/ssr` cookie clients + PKCE; authorize with `getUser()` |
| Supabase Auth (email) | Assume local confirm policy = prod | Explicit confirm + SMTP/Inbucket docs; allowlisted redirect URLs |
| Medusa Store API | Call with fetch, missing publishable key | Keep Medusa JS SDK; publishable key + customer-scoped auth |
| Medusa customer actor | Supabase user id used as `actor_id` | Link/create Medusa customer; use Medusa customer id for Store APIs |
| Medusa Admin | Reuse customer JWT for `/admin` | Separate `user` actor + Admin CORS/session path |
| Medusa CORS | Only update `STORE_CORS` | Also `AUTH_CORS` / `ADMIN_CORS` for Admin + auth endpoints |
| JWT secrets | Leave `JWT_SECRET=supersecret` from template | Rotate on cutover; fail boot on known defaults in prod |
| Cart cookie | Transfer before Medusa auth headers ready | Transfer only after customer-bound credentials exist |
| Cache tags | Revalidate customer tags on Supabase login only | Revalidate after Medusa actor bind + cart transfer |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Auth header hub fan-out (29+ cookie reads) | Slow RSC navigations after adding Supabase cookie reads | Batch session + Medusa headers once per request context | Noticeable under authenticated browsing, not raw user count |
| `retrieveCustomer` with `force-cache` + wrong tags | Stale account/order UI after login/logout | Tie cache tags to new session id; revalidate on every auth transition | First week of cutover QA |
| Extra Auth `getUser` on every middleware hop | Edge latency spikes | Refresh session in middleware thoughtfully; don’t double-call getUser+getSession everywhere | High-traffic storefront |
| Self-hosted Supabase + Medusa on one Postgres without pools | Connection exhaustion | Separate Auth DB (default local stack) vs Medusa `DATABASE_URL`; pool correctly | Dev machines with many watchers / small prod VPS |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `service_role` in browser or `NEXT_PUBLIC_` | Full Auth/DB admin compromise | Server-only privileged path; CI grep |
| Authz from `user_metadata` | Privilege escalation | `app_metadata` + Medusa actor checks |
| Dual password systems | Credential confusion, orphan sessions | Hard remove Medusa password auth |
| No invalidation of `_medusa_jwt` at cutover | Old Medusa sessions keep commerce access | Clear cookies + rotate secrets |
| Linking admin by email alone | Customer → admin takeover | Explicit admin invite + role claim |
| Logging Auth headers via `medusaError` | Token leakage in logs | Sanitize logs; never log Authorization |
| RLS off on any new public link tables | Data API exposure if tables exposed | Enable RLS + ownership policies if Supabase tables used for links |
| Long-lived access tokens + no revoke on password change | Stolen JWT after reset | Short expiry; revoke on security events |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent cart transfer failure | “My bag emptied when I logged in” | Explicit error + retry; never claim login success if cart critical |
| Confirm email policy surprise | Local works, prod blocks | Same confirm policy in local config; clear “check email” state |
| Dual verify/reset UIs | Wrong link, support chaos | One IdP owns verify/reset copy and routes |
| Profile still promises Medusa password change | Broken settings after migration | Wire Supabase update/reset or remove copy (stub already lies) |
| Fake email update success | Trust loss | Disable until provider-backed email change exists |
| No toaster on auth failures | Silent failures | Restore notification primitive on auth mutations |
| Pending signup cookie device-bound | Empty name after confirm on phone | Server-side pending profile keyed by Supabase user |

## "Looks Done But Isn't" Checklist

- [ ] **Storefront login:** Supabase session alone is not enough — verify Medusa customer retrieve succeeds
- [ ] **Cart transfer:** Guest cart → login preserves line items in e2e
- [ ] **Logout:** Clears Supabase cookies **and** any Medusa auth/cache cookies; subsequent Store calls unauthenticated
- [ ] **Email confirm:** Local `config.toml` matches intended prod confirm policy; redirect URLs allowlisted
- [ ] **Password reset:** Supabase recovery works; Medusa/reset stubs and verify-account Medusa routes removed or redirected
- [ ] **Admin:** Supabase admin login yields usable Medusa Admin session; customer accounts cannot access `/app`
- [ ] **emailpass removal:** Zero storefront/backend customer password login paths; Admin password login removed
- [ ] **Secrets:** No service role in storefront env; `JWT_SECRET` / `COOKIE_SECRET` not template defaults in shared envs
- [ ] **Auth header empty check:** `"authorization" in authHeaders` (not truthy `{}`)
- [ ] **CORS:** `STORE_CORS`, `AUTH_CORS`, `ADMIN_CORS` include real storefront and admin origins
- [ ] **Cache:** Login/logout revalidates customer + cart tags
- [ ] **Runbook:** `supabase start` + Inbucket + Medusa + storefront documented

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dual IdP left enabled | MEDIUM | Feature-flag kill Medusa login; force logout all; communicate password reset via Supabase only |
| Service role leaked to client | HIGH | Rotate Supabase keys immediately; audit Auth logs; redeploy without public secret; review commits |
| Cart transfer missed | LOW–MEDIUM | Hotfix transfer step; optional backfill script not required — users rebuild carts |
| Confirm redirects wrong | LOW | Fix `site_url` / redirect allowlist; resend confirm emails |
| Admin link by email exploited | HIGH | Revoke admin roles; rotate secrets; re-invite admins via controlled flow; audit admin actions |
| Orphan Medusa JWTs after cutover | MEDIUM | Clear `_medusa_jwt` sitewide (versioned cookie name) + rotate `JWT_SECRET` |
| Stale SSR session bugs | MEDIUM | Adopt `@supabase/ssr` correctly; middleware refresh; replace `getSession` authz |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Service-role leakage / SSR cookie foundation | Phase 1 — Supabase SSR clients + env boundaries | CI grep for public secrets; middleware/`getUser` smoke test |
| Confirm/reset UX + redirect allowlists | Phase 2 — Storefront Supabase auth (register/login/logout/verify/reset) | Local Inbucket confirm + reset e2e; config parity checklist |
| Supabase≠customer actor; cart transfer | Phase 3 — Medusa customer link + cart transfer | Guest cart → login preserves items; `/store/customers/me` OK |
| Admin vs customer actor confusion | Phase 4 — Admin Supabase + Medusa `user` actor | Customer cannot hit `/admin`; admin can use `/app` |
| Dual `emailpass` / orphan JWTs | Phase 5 — Remove Medusa-native password auth + invalidate old cookies | Grep clean; old JWT rejected; only Supabase passwords work |
| CORS/JWT secrets / runbook / metadata authz | Phase 6 — Hardening + docs | CORS matrix; secret boot checks; `app_metadata` review |
| `getSession` authz / editable `user_metadata` | Phase 1 + Phase 4 | Code review: no `user_metadata` authz; `getUser` on server |
| Fake profile email/password UX | Phase 2 (disable or implement) | Profile no longer lies; reset via Supabase only |

## Sources

- Project: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/INTEGRATIONS.md` (brownfield auth surface, dual-auth risk, cart transfer fragility) — **confidence: HIGH**
- Code: `apps/storefront/src/lib/data/customer.ts` (`completeLogin`, identity collision, verification, `transferCart`); `cookies.ts` (`_medusa_jwt`, `getAuthHeaders`) — **confidence: HIGH**
- Supabase skill security checklist (service role, `user_metadata` vs `app_metadata`, session revoke) — `.agents/skills/supabase/SKILL.md` — **confidence: MEDIUM** (classify-confidence `context7`+verified → MEDIUM)
- Supabase docs via MCP `search_docs`: SSR clients, `getSession` vs `getUser` warning, password auth confirm defaults (hosted vs self-hosted/local), redirect URL allowlists, SMTP — **confidence: MEDIUM**
- Medusa skill `building-with-medusa/reference/authentication.md` (customer vs user actors, `/store/customers/me`, Admin auth methods) — **confidence: MEDIUM**
- Medusa storefront skill: always use JS SDK / publishable key — **confidence: MEDIUM**
- Self-hosted quirks: local confirm default false; Inbucket; `config.toml` redirect URLs; custom SMTP for real delivery — Supabase password + self-hosting docs via MCP — **confidence: MEDIUM**

### Gaps (phase-specific research later)

- Exact Medusa 2.21 mechanism to mint Store/Admin credentials after external IdP (custom auth provider vs server-side token exchange) — needs Phase 3/4 design research
- Whether Admin UI can be fully re-skinned for Supabase login without forking Admin — needs Phase 4 spike
- Production Supabase host choice deferred by PROJECT.md — pitfalls above still apply once env-ready

---
*Pitfalls research for: Medusa + self-hosted Supabase Auth migration*
*Researched: 2026-10-08*
