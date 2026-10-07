# Phase 1 — Supabase Local + SSR Foundation — Context

**Mode:** mvp  
**Requirements:** SESS-01, SESS-02, SESS-03  
**Source:** PROJECT.md Key Decisions + research SUMMARY/STACK/ARCHITECTURE

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | Self-hosted Supabase local Auth at `http://127.0.0.1:54321` | Project constraint; CLI defaults + MCP |
| D-02 | Storefront uses `@supabase/ssr` cookie clients; authorize with `getUser()` not `getSession` alone | Official SSR path; avoids stale session authz |
| D-03 | Publishable/anon keys only in `NEXT_PUBLIC_*`; service-role/secret only on Medusa backend | Security baseline; SESS-03 |
| D-04 | Keep Medusa commerce Postgres separate from Supabase Auth DB | Architecture anti-pattern: never merge DBs |
| D-05 | Pin packages: `@supabase/supabase-js@2.117.3`, `@supabase/ssr@0.12.7`, CLI `supabase@2.120.0` | Research STACK pins; do not bump Medusa |

## Deferred Ideas

- Production hosted Supabase provider choice (env-swappable only)
- OAuth / magic-link / 2FA
- Password hash migration

## Claude's Discretion

- Exact folder for `supabase/` init (repo root vs `apps/backend`) — prefer **repo root** `supabase/` so both apps share one local Auth host
- Middleware composition order (region first vs Supabase refresh first) — prefer refresh cookies on the response that already carries region cookie logic without dropping either

## Success Lock

Operator can `supabase start`, storefront can create SSR clients from documented env, `getUser()` works after a test sign-in cookie path, and no secret keys ship in public env.
