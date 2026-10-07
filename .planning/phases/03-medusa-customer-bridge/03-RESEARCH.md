# Phase 3 Research — Medusa Customer Bridge

**Confidence:** MEDIUM (provider token-exchange shape needs validate-against-docs during execute)  
**Distilled from:** ARCHITECTURE dual-session, STACK provider shape, `customer.ts` completeLogin/transferCart

## Problem

Supabase session proves identity but Store APIs need Medusa `customer` actor + Bearer `_medusa_jwt`. Guest cart transfer requires customer-bound headers.

## Recommended shape

1. `AbstractAuthModuleProvider` with `static identifier = "supabase"`
2. `authenticate({ body: { access_token } })` → verify via `supabase.auth.getUser(access_token)` (local HS256) using backend service/anon client → upsert AuthIdentity by provider identity = Supabase `sub`
3. Workflow/steps: ensure Customer by email; set auth identity `app_metadata.customer_id`
4. Storefront: after `signInWithPassword`, `sdk.auth.login("customer","supabase",{ access_token })` → `setAuthToken` → retrieve/create customer if actor empty (mirror existing completeLogin) → `transferCart()`
5. Wire provider in `medusa-config.ts` Auth module; keep `emailpass` until Phase 5 (Phase 3 may register both temporarily for Admin continuity — but storefront must not call emailpass). Prefer configuring `authMethodsPerActor.customer: ["supabase"]` when storefront is fully switched; leave `user: ["emailpass"]` until Phase 4/5 if needed to avoid Admin lockout.

**Lock for this phase:** Customer actor methods include `supabase`. Do not remove Admin emailpass until Phase 4/5.

## Code touchpoints

- New: `apps/backend/src/modules/supabase-auth/*`
- New: `apps/backend/src/workflows/exchange-supabase-customer.ts` (+ steps)
- Modify: `apps/backend/medusa-config.ts`
- Modify: `apps/storefront/src/lib/data/customer.ts` post-auth exchange + transferCart order
- Dep: `jose@6.2.12` optional; `@supabase/supabase-js` on backend for getUser

## Pitfalls

- Marking login success before Medusa JWT exists
- Calling transferCart before customer actor
- Trusting user_metadata for customer_id
- Business logic in route handlers instead of workflows

## Package legitimacy

| Package | Status |
|---------|--------|
| `jose@6.2.12` | [VERIFIED] if JWKS path used |
| `@supabase/supabase-js` on backend | [VERIFIED] for getUser |

## Out of scope

Admin user bridge, emailpass removal, kill-switch metrics.
