# Architecture Research

**Domain:** Medusa 2 commerce + Supabase Auth (sole credential store) — brownfield monorepo
**Researched:** 2026-10-08
**Confidence:** HIGH (storefront dual-session + customer link); MEDIUM (Admin UI login swap mechanics)

## Standard Architecture

### System Overview

Supabase Auth owns **credentials** (email/password, verify, reset). Medusa owns **commerce and admin actors** (Customer, User, carts, orders, Store/Admin APIs). The storefront keeps its existing Medusa JS SDK + httpOnly `_medusa_jwt` pattern for Store API calls; identity login moves to `@supabase/ssr` cookie sessions first, then a **token exchange** establishes the Medusa actor session.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Browser (shopper / admin)                         │
└───────────────┬───────────────────────────────┬──────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────────┐
│  Next.js Storefront           │   │  Medusa Admin UI (/app)               │
│  apps/storefront              │   │  apps/backend Admin dashboard         │
│  • @supabase/ssr cookies      │   │  • Custom Supabase login entry        │
│  • Server Actions (auth)      │   │  • Session cookie → Admin SDK         │
│  • _medusa_jwt (commerce)     │   │  • auth.type = "session"              │
│  • _medusa_cart_id            │   └───────────────────┬───────────────────┘
└───────────────┬───────────────┘                       │
                │                                       │
     ┌──────────┴──────────┐                            │
     ▼                     ▼                            ▼
┌──────────────┐   ┌──────────────────────────────────────────────┐
│ Self-hosted  │   │  Medusa Backend (@dtc/backend :9000)         │
│ Supabase     │   │  • Store + Admin APIs                        │
│ Auth/GoTrue  │   │  • Auth Module + custom `supabase` provider  │
│ 127.0.0.1:   │◄──┤  • Bridge workflows (link actors)            │
│ 54321        │   │  • Customer / User / Cart modules            │
│ (credentials │   │  • PostgreSQL DATABASE_URL (commerce only)   │
│  only)       │   └──────────────────────────────────────────────┘
└──────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Self-hosted Supabase Auth | Sole password store; email verification; password reset; issues access/refresh tokens | Local Supabase CLI stack (`http://127.0.0.1:54321`); GoTrue; Auth schema separate from Medusa DB |
| Storefront Supabase SSR clients | Cookie-backed Supabase session for Server Components, Server Actions, middleware refresh | `@supabase/ssr` `createServerClient` / `createBrowserClient` under `apps/storefront/src/lib/supabase/` |
| Storefront auth Server Actions | Register/login/logout/reset via Supabase; then exchange for Medusa actor JWT; cart transfer | Rewrite `apps/storefront/src/lib/data/customer.ts`; drop `sdk.auth.*("emailpass")` |
| Storefront cookie/session layer | Keep cart + Medusa JWT helpers; add/clear Supabase cookies via SSR helpers; no passwords in cookies | Extend `cookies.ts` patterns; Supabase cookies owned by `@supabase/ssr` |
| Medusa `supabase` Auth Module Provider | Validate Supabase JWT; upsert `AuthIdentity` / provider identity; no password hashing | `apps/backend/src/modules/supabase-auth/` (or Auth provider package) registered in `medusa-config.ts` |
| Medusa actor-link workflows | Create/link Customer or User; set `authIdentity.app_metadata.{customer_id\|user_id}` | `apps/backend/src/workflows/link-supabase-customer.ts`, `link-supabase-admin-user.ts` |
| Medusa Store/Admin APIs | Unchanged commerce/admin authorization once actor JWT/session present | Existing `/store/*`, `/admin/*`; `authenticate` middleware unchanged |
| Admin login bridge | Supabase email/password UI → Medusa `user` actor + session | Custom Admin UI route/widget or replaced login entry; Admin SDK `auth: { type: "session" }` |
| Publishable API key | Storefront → Store API scoping (not a user credential) | Existing `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` |

## Recommended Project Structure

```
apps/
├── storefront/src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # browser createBrowserClient (publishable key only)
│   │   │   ├── server.ts          # createServerClient + cookie adapters
│   │   │   └── middleware.ts      # session refresh helper for Edge middleware
│   │   ├── data/
│   │   │   ├── customer.ts        # Supabase auth actions + Medusa exchange + transferCart
│   │   │   └── cookies.ts         # _medusa_jwt / cart (keep); drop pending-emailpass paths
│   │   └── config.ts              # Medusa SDK (jwt auth type unchanged)
│   ├── middleware.ts              # region + Supabase getUser refresh (compose carefully)
│   └── modules/account/           # forms call Server Actions; verify/reset → Supabase UX
└── backend/src/
    ├── modules/supabase-auth/     # Auth Module Provider: authenticate via Supabase JWT
    ├── workflows/
    │   ├── steps/
    │   │   ├── verify-supabase-jwt.ts
    │   │   ├── upsert-auth-identity.ts
    │   │   ├── ensure-customer-actor.ts
    │   │   └── ensure-admin-user-actor.ts
    │   ├── exchange-supabase-customer.ts
    │   └── exchange-supabase-admin.ts
    ├── api/
    │   ├── store/auth/supabase/route.ts   # optional thin route if not using provider login path
    │   └── admin/auth/supabase/route.ts   # admin exchange (workflow only)
    └── admin/                             # custom login page / replace emailpass entry
```

### Structure Rationale

- **`lib/supabase/`:** Isolates SSR cookie clients from Medusa SDK; matches Supabase docs for Next.js App Router.
- **`customer.ts` still orchestrates:** Keeps existing Server Action surface for account UI; only the credential step changes.
- **Backend provider + workflows:** Credentials verification and actor linking are Medusa mutations → workflows; routes stay thin (building-with-medusa `arch-workflow-required`).
- **Separate Supabase vs Medusa Postgres:** Self-hosted Supabase must not share Medusa `DATABASE_URL`; Auth tables stay in Supabase’s DB.

## Architectural Patterns

### Pattern 1: Dual-session trust boundary (recommended)

**What:** Two sessions coexist after login — Supabase cookie session (identity) and Medusa JWT/session (actor authorization for Store/Admin APIs).
**When to use:** Always for this milestone. Supabase is credential SoT; Medusa APIs still require Medusa auth context (`req.auth_context.actor_id`).
**Trade-offs:** Two cookies/token families to clear on logout; clearer security boundary than trying to make Medusa accept raw Supabase JWTs on every Store route.

**Example (storefront Server Action sketch):**

```typescript
// After Supabase sign-in (server-only)
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) return { state: "error", message: error.message }

// Exchange: Medusa custom provider validates access_token, returns Medusa JWT
const token = await sdk.auth.login("customer", "supabase", {
  access_token: data.session.access_token,
})
await setAuthToken(token as string)
await ensureCustomerActor() // retrieve → create if missing → re-login if needed
await transferCart()
```

### Pattern 2: AuthIdentity ≠ Customer/User actor

**What:** Medusa Auth Module stores `AuthIdentity`; Customer/User IDs live in `app_metadata` as `customer_id` / `user_id`. Linking is mandatory before `/store/customers/me` or Admin APIs work.
**When to use:** Every successful Supabase → Medusa exchange.
**Trade-offs:** Same as today’s emailpass `completeLogin` probe/`customer.create` flow — keep that orchestration, change only how the AuthIdentity is proven.

**Example:**

```json
{
  "app_metadata": {
    "customer_id": "cus_123"
  }
}
```

### Pattern 3: Custom `supabase` Auth Module Provider (not OAuth redirect)

**What:** Implement a Medusa Auth provider whose `authenticate` verifies a Supabase access token (JWKS / GoTrue), then returns success + `AuthIdentity`. Password register/reset never touch Medusa.
**When to use:** Prefer over ad-hoc unverified “create JWT” hacks; keeps Admin and Store on one provider id (`supabase`) and allows removing `emailpass`.
**Trade-offs:** Not the Google-style `location` redirect flow — email/password completes in Supabase first, then Medusa `authenticate("supabase", { body: { access_token } })`. Closer to token exchange than Medusa’s OAuth third-party diagram.

### Pattern 4: Admin session bridge

**What:** Admin dashboard continues to use Medusa **session** auth (`auth: { type: "session" }` in Admin SDK). After Supabase login, call Medusa auth for actor `user` + provider `supabase`, then establish session (`/auth/session`) so existing Admin UI cookies work.
**When to use:** Required — Admin cannot keep using Medusa emailpass once credentials leave Medusa.
**Trade-offs:** Highest integration risk: stock Admin login UI assumes emailpass. Plan a **custom Admin login entry** (UI route) that performs Supabase sign-in + exchange, then redirects into `/app`. Pre-create Medusa `User` rows (or auto-provision from allowlisted emails) and set `app_metadata.user_id`.

## Data Flow

### Request Flow (authenticated shopper, post-login)

```
Shopper submits email/password
    ↓
Server Action → supabase.auth.signInWithPassword (@supabase/ssr cookies set)
    ↓
sdk.auth.login("customer", "supabase", { access_token })
    ↓
Medusa Auth provider verifies JWT → AuthIdentity
    ↓
Workflow ensures Customer + app_metadata.customer_id
    ↓
Medusa JWT → setAuthToken (_medusa_jwt httpOnly)
    ↓
transferCart(_medusa_cart_id → customer cart)
    ↓
Subsequent RSC/actions: getAuthHeaders() → Bearer → /store/*
```

### State Management

```
Supabase session cookies  →  identity (who can prove email/password)
_medusa_jwt               →  Medusa customer actor for Store API
_medusa_cart_id           →  guest/auth cart continuity
_medusa_cache_id          →  Next cache tag namespace (unchanged)
```

Logout must clear **both** Supabase session (`signOut`) and Medusa token (`removeAuthToken` / `sdk.auth.logout` as applicable) plus revalidate customer/cart tags.

### Key Data Flows

1. **Register:** Supabase `signUp` (verification email via Supabase) → on confirmed session → Medusa exchange → `customer.create` if no actor → `_medusa_jwt` → optional cart transfer. Drop `_medusa_pending_customer` emailpass path and Medusa verification UI.
2. **Login:** Supabase `signInWithPassword` → exchange → ensure actor → `_medusa_jwt` → `transferCart()`.
3. **Password reset / verify:** Entirely Supabase (`resetPasswordForEmail`, email templates, redirect URLs). Storefront pages become thin wrappers; remove Medusa `sdk.auth.verification.*` for customers.
4. **Admin login:** Supabase sign-in (same project; authorize via Medusa User existence / `app_metadata` role — **never** trust `user_metadata` for authz) → exchange for `user` actor → create Medusa session → Admin UI.
5. **Commerce after auth:** Unchanged — SDK + publishable key + Bearer/session; no Supabase service-role in browser.

## Suggested Build Order

Order is dependency-driven for the roadmap; do not invert 1–4.

| Step | Work | Why first |
|------|------|-----------|
| **1** | Self-hosted Supabase local + env (`NEXT_PUBLIC_SUPABASE_URL`, publishable key; backend JWKS/URL secrets). Document runbook. | Nothing else can authenticate without Auth host |
| **2** | Storefront `@supabase/ssr` clients + middleware session refresh (compose with existing region middleware) | Cookie identity foundation |
| **3** | Medusa `supabase` Auth provider + customer exchange workflow + tests | Actor link before UI cutover |
| **4** | Rewire `customer.ts` Server Actions; preserve `transferCart`; account UI forms | Shopper cutover |
| **5** | Replace verify/reset pages with Supabase flows; delete Medusa customer emailpass usage | Dual-auth risk window closes for store |
| **6** | Admin: ensure User actor link workflow + custom Admin login → session bridge | Harder surface; after store pattern proven |
| **7** | Remove `emailpass` provider from `medusa-config` / seed paths; grep-clean storefront + backend | Milestone success: zero native password auth |
| **8** | Env templates + local runbook (Supabase + Medusa + storefront) | Operability |

**Phase research flag:** Step 6 (Admin login UI replacement) needs deeper phase research — stock Medusa Admin login is not designed for external IdP; expect custom Admin UI route and explicit session establishment.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Dual-session as above; single Medusa instance; local/self-hosted Supabase fine for dev |
| 1k–100k users | Cache JWKS; short-lived Medusa JWT; rate-limit exchange routes; keep Supabase and Medusa DBs separate |
| 100k+ users | Consider edge JWT verification caching; Admin SSO later; still do not merge Auth DB into commerce DB |

### Scaling Priorities

1. **First bottleneck:** Auth exchange route / JWT verification on every login — cache JWKS, keep handler thin.
2. **Second bottleneck:** Middleware doing both region fetch and Supabase refresh — measure Edge latency; avoid Medusa SDK in middleware.

## Anti-Patterns

### Anti-Pattern 1: Dual password systems

**What people do:** Leave Medusa `emailpass` as fallback “just in case.”
**Why it's wrong:** Two credential stores diverge; milestone fails; support resets break.
**Do this instead:** Feature-flag only during cutover; then remove `emailpass` entirely from config and code paths.

### Anti-Pattern 2: Trusting Supabase `user_metadata` for roles

**What people do:** Put `role: admin` in user-editable metadata and authorize Admin from it.
**Why it's wrong:** Supabase documents `user_metadata` as user-editable; unsafe for authz.
**Do this instead:** Authorize Admin by Medusa `User` existence / `app_metadata` set server-side after allowlist checks; use Supabase `app_metadata` only if set via service role on the server.

### Anti-Pattern 3: Exposing service-role / secret keys to Next public env

**What people do:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE` for “easier” user admin.
**Why it's wrong:** Full Auth/DB bypass in the browser.
**Do this instead:** Publishable/anon in storefront; service role only in Medusa backend if needed for provisioning.

### Anti-Pattern 4: Skipping Medusa customer/user actor link

**What people do:** Treat Supabase session as enough for Store API calls.
**Why it's wrong:** Medusa Store/Admin protected routes require Medusa auth context and actor IDs.
**Do this instead:** Always exchange → ensure `app_metadata.customer_id` / `user_id` → Medusa JWT/session.

### Anti-Pattern 5: Business logic in exchange route handlers

**What people do:** Create customers, link identities, and mint tokens inline in `route.ts`.
**Why it's wrong:** Violates Medusa workflow/compensation patterns; hard to test.
**Do this instead:** Workflows + steps; routes only validate input and run workflows.

### Anti-Pattern 6: Merging Supabase and Medusa Postgres

**What people do:** Point Medusa `DATABASE_URL` at Supabase DB or vice versa “to simplify.”
**Why it's wrong:** Coupled migrations, Auth schema conflicts, backup/blast radius.
**Do this instead:** Two databases; link identities by Supabase `user.id` + email metadata on Medusa AuthIdentity.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Self-hosted Supabase Auth | Storefront: `@supabase/ssr` cookies; Backend: JWT verify (JWKS) in Auth provider | Dev URL `http://127.0.0.1:54321`; configure redirect URLs for reset/verify |
| Medusa Auth Module | Custom provider `supabase`; remove `emailpass` after cutover | Actor types `customer` and `user` |
| Medusa Store API | Existing JS SDK + `_medusa_jwt` Bearer | Keep publishable key |
| Medusa Admin API / UI | Session after Supabase exchange | Custom login entry required |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Storefront ↔ Supabase | Cookie session via SSR clients | `getUser()` for auth decisions (not untrusted `getSession()` alone) |
| Storefront ↔ Medusa | HTTPS + JWT cookie → Authorization Bearer | Server Actions / RSC only; no client SDK with httpOnly JWT |
| Auth provider ↔ GoTrue | JWKS / introspect access token | No password forwarded into Medusa |
| Workflow ↔ Customer/User modules | Module services via steps | Set `app_metadata` on AuthIdentity |
| Admin UI ↔ Medusa | Session cookie | After bridge; Admin SDK `auth.type = "session"` |

## Sources

- Medusa Auth Identity & Actor Types — https://docs.medusajs.com/resources/commerce-modules/auth/auth-identity-and-actor-types (official; HIGH)
- Medusa Authentication Flows — https://docs.medusajs.com/resources/commerce-modules/auth/auth-flows (official; HIGH)
- Medusa Storefront Login (JWT vs session) — https://docs.medusajs.com/resources/storefront-development/customers/login (official; HIGH)
- Medusa Third-Party Storefront Login — https://docs.medusajs.com/resources/storefront-development/customers/third-party-login (official; HIGH — OAuth pattern; adapted here to token exchange)
- Supabase SSR client / cookies — https://supabase.com/docs/guides/auth/server-side/creating-a-client (official via MCP `search_docs`; HIGH)
- Supabase skill security rules (`getUser`, no service role in browser, no `user_metadata` authz) — project `.agents/skills/supabase/SKILL.md` (curated; HIGH)
- Medusa skills: `building-with-medusa` authentication reference; Admin SDK session config in `building-admin-dashboard-customizations` (curated; HIGH)
- Codebase maps: `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`; live auth in `apps/storefront/src/lib/data/customer.ts` + `cookies.ts` (project; HIGH)
- Admin login UI swap specifics — MEDIUM confidence pending phase spike against current `@medusajs/dashboard` login surface

---
*Architecture research for: Medusa 2 + Supabase Auth sole credential store*
*Researched: 2026-10-08*
