# Phase 3 — Medusa Customer Bridge — Context

**Mode:** mvp  
**Requirements:** BRIDGE-01, BRIDGE-02, BRIDGE-03  
**Depends on:** Phase 2 Supabase identity sessions

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-11 | Custom Medusa Auth Module Provider `supabase` validates Supabase access token (not passwords) | STACK/ARCHITECTURE; official Auth Module extension |
| D-12 | After Supabase auth, find-or-create Medusa Customer linked by email and/or Supabase `sub`; set `app_metadata.customer_id` | AuthIdentity ≠ actor pattern |
| D-13 | Storefront persists Medusa JWT in `_medusa_jwt` via `sdk.auth.login("customer","supabase",{ access_token })` | Keep Store API auth model |
| D-14 | Call existing `transferCart` only after Medusa customer-bound token exists | Preserve cart contract; order matters |
| D-15 | Prefer `auth.getUser(jwt)` for local HS256; `jose` JWKS optional for hosted asymmetric later | STACK local vs hosted |
| D-16 | Credentials never stored/hashed in Medusa; `register` on provider rejects or no-ops password registration | Hard cutover prep |

## Deferred Ideas

- Durable standalone `supabase_user_id` map table (AUTH-V2-03)
- Automated e2e suite as milestone gate (AUTH-V2-05) — optional smoke test OK
- Admin user actor (Phase 4)

## Claude's Discretion

- Provider directory name: `apps/backend/src/modules/supabase-auth/`
- Whether thin `/store/auth/supabase` route is needed — prefer SDK provider login only; add thin route only if SDK cannot post body
- Same email as both customer and admin: deny admin elevation from customer login; linking policy = separate actors by Medusa actor type

## Success Lock

After Supabase login, shopper has Medusa Customer + `_medusa_jwt` and guest cart transfers.
