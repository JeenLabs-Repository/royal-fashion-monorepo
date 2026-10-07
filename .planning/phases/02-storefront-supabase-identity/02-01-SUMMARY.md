---
phase: 02-storefront-supabase-identity
plan: 01
subsystem: auth
tags: [supabase, nextjs, server-actions, storefront]

requires:
  - phase: 01-supabase-local-ssr-foundation
    provides: SSR createClient / getUser helpers
provides:
  - Storefront signup/login/signout via Supabase Auth only
  - CustomerAuthState-compatible Server Actions for account UI
affects:
  - 02-02 email confirm and password reset
  - 03 Medusa customer bridge

actuals:
  tokens: 4511
  tasks: 3
  commits: 2

plan_head_before: 299f976e23aaf6ca90ef6d0d8fb7fcc9f5121d8c
plan_head_after: ceb7ec4cd6767f385b80d42e1d8a638cdf6780a4

tech-stack:
  added: []
  patterns:
    - Server Actions call createClient() then auth.signUp / signInWithPassword / signOut
    - No _medusa_jwt mint on identity success (Phase 3)

key-files:
  created:
    - apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts
  modified:
    - apps/storefront/src/lib/data/customer.ts
    - apps/storefront/src/modules/account/components/login/index.tsx
    - apps/storefront/src/modules/account/components/register/index.tsx
    - apps/storefront/package.json

key-decisions:
  - "Identity success returns CustomerAuthState without Medusa JWT or transferCart"
  - "Signup profile fields kept in _medusa_pending_customer + user_metadata for Phase 3 only (non-authz)"
  - "confirmEmailVerification stubbed to point shoppers at Supabase email links"

patterns-established:
  - "Auth Server Actions use @lib/supabase/server createClient"
  - "Source-contract unit tests under lib/data/__tests__"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: Login uses signInWithPassword; no emailpass sdk.auth.login
    requirement: AUTH-02
    verification:
      - kind: unit
        ref: apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts#login path
        status: pass
    human_judgment: false
  - id: D2
    description: Signup uses signUp; no sdk.auth.register
    requirement: AUTH-01
    verification:
      - kind: unit
        ref: apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts#signup
        status: pass
    human_judgment: false
  - id: D3
    description: Signout calls supabase signOut and removeAuthToken
    requirement: AUTH-03
    verification:
      - kind: unit
        ref: apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts#signout
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-08
status: complete
---

# Phase 2 Plan 01: Storefront Supabase Identity Summary

**Shopper register, login, and logout Server Actions now use Supabase Auth only; Medusa emailpass is removed from those paths.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-08T04:57:11Z
- **Completed:** 2026-10-08T05:05:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `completeLogin` / `login` call `signInWithPassword` via Phase 1 server client
- `signup` calls `signUp` with profile in user metadata + pending-customer cookie for Phase 3
- `signout` calls Supabase `signOut` then `removeAuthToken` so leftover Medusa JWTs cannot linger
- Account login/register copy notes identity vs store-bridge timing

## Task Commits

1. **Task 1–3 (tests):** `8bf9826` — customer auth contract tests + npm script
2. **Task 1–3 (impl):** `ceb7ec4` — Supabase signup/login/signout + form copy

## Deviations from Plan

None - plan executed as written (login/signup/signout in one implementation pass after RED contract tests).

## Self-Check: PASSED

- FOUND: apps/storefront/src/lib/data/customer.ts (signInWithPassword, signUp, signOut)
- FOUND: commits 8bf9826, ceb7ec4 ancestors of HEAD
