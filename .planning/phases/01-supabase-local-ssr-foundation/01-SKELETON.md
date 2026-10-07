# Walking Skeleton — Royal Fashion Supabase Auth Migration

**Phase:** 1  
**Generated:** 2026-10-08

## Capability Proven End-to-End

A developer can start local Supabase Auth, configure storefront env from templates, and the Next.js storefront can refresh a durable Supabase SSR cookie session and call `getUser()` after a known test sign-in — without Medusa password auth involved.

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 App Router storefront + Medusa 2.21 backend | Existing monorepo; no rewrite |
| Identity host | Self-hosted Supabase local (`127.0.0.1:54321`) | PROJECT + D-01 |
| SSR session | `@supabase/ssr` cookies + `getUser()` | Official SSR; D-02 |
| Commerce DB | Existing Medusa Postgres (`DATABASE_URL`) | Separate from Supabase Auth DB; D-04 |
| Secrets | Publishable in `NEXT_PUBLIC_*` only | D-03 / SESS-03 |
| Deployment (dev) | Local Docker Supabase + `pnpm` Turbo apps | Runbook-documented |

## Stack Touched in Phase 1

- [x] Supabase CLI project (`supabase/` at repo root)
- [x] Env templates for storefront + backend
- [x] Storefront `@supabase/ssr` browser + server clients
- [x] Middleware session refresh composed with region middleware
- [ ] Register/login UI — Phase 2
- [ ] Medusa Auth provider / customer actor — Phase 3
- [ ] Admin Supabase login — Phase 4
- [ ] emailpass removal — Phase 5

## Out of Scope (Deferred to Later Slices)

- Storefront identity UX (register/login/logout/verify/reset)
- Medusa customer/admin bridge and `_medusa_jwt` mint via `supabase` provider
- Hard cutover of Medusa password auth
- Production Supabase host selection

## Subsequent Slice Plan

- Phase 2: Shopper register/login/logout/verify/reset via Supabase only
- Phase 3: Token exchange → Medusa Customer + cart transfer
- Phase 4: Admin Supabase login → Medusa `user` session
- Phase 5: Remove all Medusa password paths + cutover messaging
