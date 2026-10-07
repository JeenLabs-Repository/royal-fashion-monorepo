# Phase 4 Research — Admin Supabase Login

**Confidence:** MEDIUM (Admin UI swap is highest uncertainty; spike during execute)  
**Distilled from:** ARCHITECTURE Admin session bridge, STACK Admin notes, building-admin skills

## Problem

Medusa Admin dashboard assumes emailpass session login. Credentials move to Supabase; Admin still needs Medusa `user` actor + session cookie for `/app` and Admin APIs.

## Approach

1. Reuse `supabase` Auth provider for actor type `user` (same token verify as customer)
2. Workflow `exchange-supabase-admin`: find Medusa User by email (must exist or allowlisted bootstrap); set `app_metadata.user_id`; **do not** create admin from arbitrary Supabase signup
3. Custom Admin UI login page: browser Supabase client (publishable key) or server route → `signInWithPassword` → `sdk.auth.login("user","supabase",{ access_token })` → establish session (`auth.session` / cookie) → redirect `/app`
4. CORS: ensure `ADMIN_CORS` / `AUTH_CORS` include Admin origin
5. Runbook: `medusa user` creates User row without relying on password as IdP; create matching Supabase Auth user; link; document order

## Pitfalls

- Customer AuthIdentity opening `/app`
- Admin-by-email without User row
- Leaving stock login as primary without redirect
- service_role in Admin browser bundle

## Out of scope

Removing emailpass from config (Phase 5), storefront changes beyond shared provider.
