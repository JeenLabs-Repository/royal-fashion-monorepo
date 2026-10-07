# Phase 1 Research — Supabase Local + SSR Foundation

**Confidence:** HIGH (official Supabase SSR + local CLI; brownfield storefront paths known)  
**Distilled from:** `.planning/research/SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md`, codebase `INTEGRATIONS.md`

## Problem

No Supabase Auth host, env contracts, or SSR cookie clients exist. Storefront still uses Medusa `emailpass` only. Phase 1 must stand up local Auth + durable SSR session plumbing without bridging Medusa yet.

## Standard stack (locked)

| Piece | Choice |
|-------|--------|
| Local Auth | Supabase CLI 2.120.0 + Docker → `http://127.0.0.1:54321` |
| Storefront clients | `@supabase/supabase-js@2.117.3` + `@supabase/ssr@0.12.7` |
| Authz API | `supabase.auth.getUser()` on server; middleware uses SSR refresh / `getClaims` pattern from current docs |
| Keys | `NEXT_PUBLIC_SUPABASE_URL` + publishable/anon; backend `SUPABASE_*` secrets never public |

## Architecture slice

```
Browser → Next middleware (region + Supabase cookie refresh)
       → Server Components / Actions via createServerClient
       → Supabase Auth (127.0.0.1:54321)
Medusa backend: env keys documented only (provider lands Phase 3)
```

## Code touchpoints

- New: `supabase/config.toml` (root), `apps/storefront/src/lib/supabase/{client,server,middleware}.ts`
- Modify: `apps/storefront/src/middleware.ts` (compose refresh)
- Env: `apps/storefront` env example / README; `apps/backend/.env.template`
- Package: `apps/storefront/package.json`; optional root or backend `supabase` CLI as `devDependency`

## Constraints

- Do not expose `service_role` / `SUPABASE_SECRET*` via `NEXT_PUBLIC_*`
- Do not merge Supabase DB with Medusa `DATABASE_URL`
- Do not rewire `customer.ts` emailpass yet (Phase 2+)
- Do not authorize from `user_metadata`

## Pitfalls

1. Using `getSession()` alone for auth decisions
2. Breaking region cookie / countryCode redirect when composing middleware
3. Committing real keys; templates must be key names only
4. Local email confirm default often OFF in `config.toml` — document policy for Phase 2

## Package legitimacy

| Package | Registry | Status |
|---------|----------|--------|
| `@supabase/supabase-js@2.117.3` | npm | [VERIFIED] official |
| `@supabase/ssr@0.12.7` | npm | [VERIFIED] official |
| `supabase@2.120.0` (CLI) | npm | [VERIFIED] official CLI |

## Out of scope this phase

Register/login UI, Medusa Auth provider, Admin login, emailpass removal.
