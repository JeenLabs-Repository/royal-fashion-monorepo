# Phase 01 Plan 01 Summary — Supabase Local + SSR Foundation

**Completed:** 2026-10-08  
**Requirements:** SESS-01, SESS-02, SESS-03

## Delivered

- Root `supabase/` project (`supabase init`) with Auth API port `54321`; `site_url` / redirects pointed at storefront `:8000`
- `supabase` CLI `2.120.0` at workspace root; scripts `supabase:start|stop|status`
- Storefront deps `@supabase/supabase-js@2.117.3`, `@supabase/ssr@0.12.7`
- Clients: `apps/storefront/src/lib/supabase/{client,server,middleware}.ts` — authorize via `getUser()`
- Middleware composes `updateSession` with existing regionMap / countryCode redirects
- Env templates: storefront `.env.example` / `.env.template` (public only); backend `.env.template` server-only keys
- README Local Supabase Auth runbook
- Automated env-boundary test: `pnpm test:env-boundary` (pass)

## Verify

```bash
cd apps/storefront && node -e "require('@supabase/ssr'); require('@supabase/supabase-js'); console.log('ok')"
cd apps/storefront && pnpm test:env-boundary
# Optional (Docker): pnpm supabase:start && pnpm supabase:status
```

## Notes

- Docker Desktop required for `supabase start` — not started in this session if Docker unavailable
- Email confirmation policy left for Phase 2 (commented in `supabase/config.toml`)
- Medusa `emailpass` / `customer.ts` untouched (Phase 2+)
