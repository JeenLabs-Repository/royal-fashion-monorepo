# Stack Research

**Domain:** Medusa 2 DTC monorepo auth cutover (Supabase Auth email/password → Medusa session bridge)
**Researched:** 2026-10-08
**Confidence:** MEDIUM (official Medusa + Supabase docs + npm registry versions; no first-party Medusa↔Supabase reference implementation)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Medusa Auth Module + custom Auth Module Provider | `@medusajs/framework` / `@medusajs/medusa` **2.21.2** (pin to existing monorepo) | Issues Medusa auth identities + Store/Admin JWTs/sessions after Supabase proves identity | Official extension point: extend `AbstractAuthModuleProvider`; configure `projectConfig.http.authMethodsPerActor` so `customer` and `user` allow **only** the custom provider ID — omitting `emailpass` removes native password auth | MEDIUM |
| `@supabase/supabase-js` | **2.117.3** (npm latest at research; peer of SSR requires `^2.114.0`) | Email/password Auth API (`signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `signOut`, `getUser`) | Official Auth client; password + verification + reset live here — not in Medusa | MEDIUM |
| `@supabase/ssr` | **0.12.7** | Next.js App Router cookie/PKCE session (`createBrowserClient`, `createServerClient`) | Current official SSR path; replaces deprecated Auth Helpers | MEDIUM |
| `@medusajs/js-sdk` | **2.21.2** (existing) | Store + Admin commerce HTTP after bridge; `sdk.auth.login("customer"\|"user", "<provider>", …)` against custom provider | Storefront/Admin skills require SDK for headers (publishable key / session); do **not** replace commerce calls with raw `fetch` | MEDIUM |
| Next.js storefront | **15.5.24** (existing) | Shopper UI; owns Supabase Auth UX | Already in monorepo; SSR + server actions match `@supabase/ssr` PKCE model | MEDIUM |
| Self-hosted Supabase (local) | CLI **`supabase` 2.120.0** + Docker | Dev Auth/API at `http://127.0.0.1:54321` (Studio `54323`, Mailpit `54324`) | Project constraint; official local defaults | MEDIUM |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `jose` | **6.2.12** | Verify Supabase access tokens via JWKS (`createRemoteJWKSet` + `jwtVerify`) on Medusa backend | Prefer when project uses **asymmetric** signing keys (hosted / new projects). JWKS URL: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` | MEDIUM |
| `@supabase/supabase-js` (service / secret client) | same as above | Backend-only: `auth.getUser(access_token)` and optional `auth.admin.*` | **Always** for local/self-hosted **HS256** stacks (JWKS may be unavailable); optional admin user provisioning — **never** ship service-role/secret to browser | MEDIUM |
| Existing `_medusa_jwt` httpOnly cookie helpers | in-repo `apps/storefront/src/lib/data/cookies.ts` | Persist **Medusa** bearer after bridge | Keep cookie name for commerce continuity; **stop** writing it from `emailpass` login | MEDIUM |
| `@tanstack/react-query` | **5.64.2** (Admin peer, existing) | Admin data fetching after session exists | Unchanged; still call Medusa via Admin SDK with `auth: { type: "session" }` | MEDIUM |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `supabase` CLI (pnpm `apps/backend` or root `devDependency`) | `supabase start` / `stop`, local keys, Mailpit for confirm/reset emails | pnpm 10+: `pnpm add -D supabase --allow-build=supabase`. Requires Docker Desktop (Windows) |
| Supabase MCP (`user-supabase`) | Auth/schema checks during implementation | Dev identity host; do not treat MCP as runtime dependency |
| Medusa Docs MCP / `docs.medusajs.com/.../index.html.md` | Auth provider + third-party login patterns | Load `building-with-medusa` `reference/authentication.md` before coding routes |

## Prescribed integration shape (opinionated)

**Identity split (hard rule):**
- **Supabase Auth** = sole credential store (email/password, confirm, reset, logout of identity session).
- **Medusa Auth Module** = sole commerce/admin **actor** session (customer / user JWT or Admin session cookie).
- Bridge **once** after successful Supabase auth: verify Supabase access token → create/link Medusa `AuthIdentity` + actor → return Medusa token/session.

**Backend (apps/backend):**
1. Add module provider under `src/modules/supabase-auth/` (or similar) whose service extends `AbstractAuthModuleProvider` with `static identifier = "supabase"` (provider id used in SDK: `"supabase"`).
2. Implement `authenticate` to accept a **Supabase access token** (not a Medusa password). Validate token (`jose` JWKS **or** `supabase.auth.getUser(jwt)`), resolve email + `sub`, upsert auth identity via `AuthIdentityProviderService`, return success without storing a password hash.
3. Implement `register` either as no-op / reject (registration only in Supabase) **or** create identity after token proof — do **not** reintroduce password hashing.
4. Wire Auth module providers in `medusa-config.ts` and set:

```ts
projectConfig: {
  http: {
    authMethodsPerActor: {
      customer: ["supabase"],
      user: ["supabase"],
    },
  },
}
```

5. **Remove** the built-in `emailpass` provider from Auth module configuration (do not leave it installed “just in case”).
6. Keep Medusa `JWT_SECRET` / `COOKIE_SECRET` — they still sign Medusa sessions; they are **not** Supabase secrets.

**Storefront (apps/storefront):**
1. Add `@supabase/supabase-js` + `@supabase/ssr`; clients via official Next.js cookie pattern; env:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (local)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or local anon key for legacy local defaults)
2. Register/login/reset/verify UI call Supabase only (`signUp` / `signInWithPassword` / `resetPasswordForEmail` / email confirm PKCE exchange).
3. After Supabase session: `sdk.auth.login("customer", "supabase", { access_token })` (payload field as implemented by provider) → persist Medusa JWT in `_medusa_jwt` → `sdk.store.customer.create` / `retrieve` when `actor_id` empty (same pattern as Medusa third-party login docs).
4. Preserve guest cart transfer **after** Medusa customer actor exists.
5. Delete Medusa `emailpass` + Medusa `sdk.auth.verification.*` UI paths.

**Admin:**
1. Same custom provider for `user` actor; Admin SDK remains `auth: { type: "session" }`.
2. Replace Admin password login entry with Supabase email/password UI (admin UI route / login override) → bridge to Medusa `/auth/user/supabase` → establish Admin session cookie.
3. Stop treating `medusa user -p` password as the login source of truth (may still seed a User row; credentials live in Supabase).

## Installation

```bash
# Storefront — identity clients
cd apps/storefront
pnpm add @supabase/supabase-js@2.117.3 @supabase/ssr@0.12.7

# Backend — JWT verify + optional CLI
cd apps/backend
pnpm add jose@6.2.12
pnpm add -D supabase@2.120.0 --allow-build=supabase

# Local Supabase (from repo or backend)
pnpm exec supabase init   # if not present
pnpm exec supabase start  # Project URL http://127.0.0.1:54321
```

Do **not** add a second lockfile; keep root `pnpm-lock.yaml` as sole lockfile.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Why not default |
|-------------|-------------|-------------------------|-----------------|
| Custom Medusa Auth Module Provider `supabase` | Ad-hoc `/store/auth/supabase-bridge` route that mints Medusa JWT without Auth Module | Prototypes only | Breaks actor/provider model; Admin + Store auth middleware expect Auth Module identities |
| Token-exchange (`access_token` → Medusa JWT) | Forward email/password to Medusa provider which calls Supabase | Never preferred | Duplicates credential handling; encourages leaving emailpass-shaped APIs |
| `@supabase/ssr` cookies | Client-only `createClient` + localStorage | SPA-only apps | Storefront is Next.js SSR; official docs mandate cookie/PKCE for SSR |
| `jose` JWKS verify | Always `auth.getUser(jwt)` | Local HS256 / simplest dual-mode verify | Slightly more network; still valid — use if JWKS absent locally |
| Admin session cookie bridge | Admin-only API keys for humans | Automation only | Operators need interactive Admin UI login |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Medusa `emailpass` as fallback or dual path | Explicit milestone veto; dual credential stores cause split-brain logins | `authMethodsPerActor` with **only** `supabase`; uninstall/disable emailpass |
| `@supabase/auth-helpers-nextjs` / Auth Helpers | Deprecated; docs migrate to `@supabase/ssr` | `@supabase/ssr` |
| Better Auth / Clerk / Auth.js / NextAuth | Out of scope; different IdP | Supabase Auth only |
| Browser-exposed `service_role` / `sb_secret_*` | Privilege escalation; Supabase security baseline | Publishable/anon on client; secret only on Medusa server |
| Authorizing from `user_metadata` / `raw_user_meta_data` | User-editable claims | Roles in `app_metadata` or Medusa actor type |
| Trusting `getSession()` alone for authz | Can be stale/unverified client storage | `getUser` / `getClaims` (SSR) + server JWT verify on bridge |
| Medusa `sdk.auth.verification.request/confirm` for shoppers | Verification must be Supabase-only | Supabase email confirm + PKCE confirm route |
| Leaving `sdk.auth.register/login(..., "emailpass", …)` | Reinstates native password auth | Supabase APIs + `sdk.auth.login(..., "supabase", …)` |
| Migrating Medusa password hashes in v1 | Out of scope | Fresh Supabase signup / reset |
| Magic link / OAuth / MFA packages in v1 | Out of scope | Email/password only |
| Raw `fetch` to Medusa Store/Admin | Missing publishable key / session headers | `@medusajs/js-sdk` |

## Stack Patterns by Variant

**If local self-hosted Supabase (this milestone default):**
- URL `http://127.0.0.1:54321`; enable email confirmations in `supabase/config.toml` if you need verify in dev (CLI default often **off**).
- Prefer `auth.getUser(access_token)` on Medusa for HS256 local JWT secret; add `jose` JWKS when moving to asymmetric keys.

**If hosted Supabase later (env-only):**
- Same packages; swap `NEXT_PUBLIC_SUPABASE_URL` + publishable key; JWKS verify with `jose` preferred.
- Prefer new publishable/secret keys (`sb_publishable_…` / `sb_secret_…`); legacy anon/service_role supported until end of 2026 per Supabase docs.

**If Admin login customization is blocked by dashboard shell:**
- Still keep custom Auth provider for `user`; add a Medusa Admin UI route that performs Supabase login + session bridge, and redirect default `/app/login` traffic there — do **not** re-enable emailpass.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@supabase/ssr@0.12.7` | `@supabase/supabase-js@^2.114.0` (verified peer); **2.117.3** OK | Install both in storefront |
| `@medusajs/*@2.21.2` | Node `>=22.22.0`, existing monorepo | Do not bump Medusa in this auth milestone unless required |
| `jose@6.x` | Node 22, Medusa backend TypeScript | Use for JWKS path only |
| `supabase@2.120.0` CLI | Docker API runtime on Windows | Not a production Node dependency of Medusa |
| Next.js `15.5.x` | React `19.0.5`, `@supabase/ssr` cookie adapter | Middleware refreshes via `getClaims()` per current SSR guide |

## Env keys to document (no values in git)

| Key | App | Public? |
|-----|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | storefront | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or local anon) | storefront | Yes |
| `SUPABASE_URL` | backend | Server |
| `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` | backend | Server (verify path) |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | backend | Server **only** |
| Existing Medusa `JWT_SECRET`, `COOKIE_SECRET`, `AUTH_CORS`, publishable key | backend / storefront | unchanged roles |

## Removal checklist (stack-level)

| Remove / stop using | Location |
|---------------------|----------|
| `sdk.auth.register/login(..., "emailpass", …)` | `apps/storefront/src/lib/data/customer.ts` |
| Medusa verification request/confirm + verify-account UX | storefront account/verify routes |
| Medusa-native password reset | storefront |
| Auth module `emailpass` provider + any `authMethodsPerActor` entries listing it | `apps/backend/medusa-config.ts` |
| Treating `medusa user -p` password as Admin login credential | runbooks / onboarding docs |

## Sources

- Medusa — [Auth Module Provider](https://docs.medusajs.com/resources/commerce-modules/auth/auth-providers) (`authMethodsPerActor`, provider list) — MEDIUM
- Medusa — [How to Create an Auth Module Provider](https://docs.medusajs.com/resources/references/auth/provider) (`AbstractAuthModuleProvider`, `authenticate` / `register` / `validateCallback`) — MEDIUM
- Medusa — [Third-Party or Social Login in Storefront](https://docs.medusajs.com/resources/storefront-development/customers/third-party-login) (login → callback → create customer if empty `actor_id`) — MEDIUM
- Medusa — [Authentication in JS SDK](https://docs.medusajs.com/resources/js-sdk/auth/overview) (JWT vs session) — MEDIUM
- Medusa skill — `.agents/skills/building-with-medusa/reference/authentication.md` — MEDIUM
- Supabase — [Creating a client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) (`@supabase/ssr`) — MEDIUM
- Supabase — [Migrating to SSR from Auth Helpers](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) — MEDIUM
- Supabase — [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — MEDIUM
- Supabase — [JWTs](https://supabase.com/docs/guides/auth/jwts) (`jose` + JWKS; HS256 → Auth server verify) — MEDIUM
- Supabase — [Local development CLI](https://supabase.com/docs/guides/local-development) (`http://127.0.0.1:54321`) — MEDIUM
- npm registry (2026-10-08) — `@supabase/supabase-js@2.117.3`, `@supabase/ssr@0.12.7`, `jose@6.2.12`, `supabase@2.120.0` — MEDIUM
- Repo map — `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/PROJECT.md` — HIGH for brownfield pins

---
*Stack research for: Medusa 2 + self-hosted Supabase Auth email/password migration*
*Researched: 2026-10-08*
