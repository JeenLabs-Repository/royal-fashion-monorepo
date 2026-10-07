# Phase 2 — Storefront Supabase Identity — Context

**Mode:** mvp  
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05  
**Depends on:** Phase 1 SSR clients + local Auth

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-06 | Register/login/logout/reset/verify use Supabase Auth APIs only (`signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, confirm/PKCE) | PROJECT: credentials leave Medusa |
| D-07 | Shared `/auth/confirm` (or country-coded equivalent) handles email confirm + recovery code exchange | Research FEATURES; single PKCE entry |
| D-08 | Drop Medusa verify-account UX and `sdk.auth.verification.*` for shoppers in this phase's UI paths | Avoid dual verify systems |
| D-09 | Local vs prod email confirmation policy pinned in `supabase/config.toml` + runbook | Avoid local surprises |
| D-10 | Do not mint `_medusa_jwt` via emailpass; Medusa exchange deferred to Phase 3 | Dependency order |

## Deferred Ideas

- In-account password change UI (AUTH-V2-01)
- Resend verification UX polish (AUTH-V2-02)
- Medusa customer create / cart transfer (Phase 3)

## Claude's Discretion

- Exact App Router path for confirm (`/[countryCode]/auth/confirm` vs `/auth/confirm`) — prefer under existing `[countryCode]/(main)` tree for locale consistency
- Whether login UI still shows success before Medusa bridge — after Phase 2, Supabase session alone is identity success; commerce bind lands Phase 3 (document in UI copy briefly if login succeeds but account portal still waits on bridge)

## Success Lock

Shopper can register, login, logout, verify email, and reset password entirely through Supabase without calling Medusa `emailpass`.
