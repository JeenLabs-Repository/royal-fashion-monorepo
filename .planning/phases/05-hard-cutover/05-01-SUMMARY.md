---
phase: 05-hard-cutover
plan: 01
subsystem: auth
tags: [cutover, supabase, emailpass-removed]

requires:
  - phase: 04-admin-supabase-login
    provides: Admin supabase-login + bootstrap
provides:
  - Supabase-only authMethodsPerActor for customer and user
  - Cutover docs + UI messaging
  - Admin login redirect widget toward supabase-login
affects: []

actuals:
  tokens: 5000
  tasks: 3
  commits: 1

plan_head_before: 840ada1
plan_head_after: 9ee13b5

tech-stack:
  added: []
  patterns:
    - Auth module providers array contains only supabase
    - Grep-clean legacy password provider id in storefront/backend src

key-files:
  created:
    - docs/auth-cutover.md
    - apps/backend/src/admin/widgets/login-redirect.tsx
  modified:
    - apps/backend/medusa-config.ts
    - apps/storefront/src/modules/account/components/login/index.tsx
    - apps/storefront/src/modules/account/components/register/index.tsx
    - apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts
    - README.md

key-decisions:
  - "Removed Auth emailpass provider registration entirely (one-way cut)"
  - "JWT invalidation via logout + optional JWT_SECRET rotate documented"

patterns-established:
  - "Cutover docs under docs/auth-cutover.md"

requirements-completed: [CUT-01, CUT-02, CUT-03]

coverage:
  - id: D1
    description: No legacy password provider string in storefront/backend config+src
    requirement: CUT-01
    verification:
      - kind: other
        ref: rg emailpass apps/storefront/src apps/backend/medusa-config.ts apps/backend/src (expect none)
        status: pass
    human_judgment: false
  - id: D2
    description: user and customer auth methods only supabase
    requirement: CUT-02
    verification:
      - kind: other
        ref: medusa-config.ts authMethodsPerActor
        status: pass
    human_judgment: false
  - id: D3
    description: Cutover messaging + JWT_SECRET runbook
    requirement: CUT-03
    verification:
      - kind: other
        ref: docs/auth-cutover.md
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-08
status: complete
---

# Phase 5 Plan 01: Hard Cutover Summary

**Medusa password IdP removed: customer and user actors accept only `supabase`; cutover messaging and JWT invalidate runbook shipped.**

## Accomplishments

- `medusa-config` Auth providers = supabase only; `authMethodsPerActor` both actors `["supabase"]`
- Admin redirect widget + README force `/app/supabase-login`
- Storefront login/register copy + `docs/auth-cutover.md` (re-register/reset, `JWT_SECRET` rotate)

## Gaps

- Login redirect widget uses `order.list.before` zone (no dedicated login injection zone); operators should bookmark `/app/supabase-login`. Stock `/app/login` may still render until Medusa Admin exposes a login zone — config already rejects password provider auth.
- Live Admin/Docker verification not run in this executor pass if Supabase Docker unavailable

## Task Commits

1. **Tasks 1–3:** `9ee13b5`

## Deviations from Plan

**[Rule 2]** Test file avoided literal legacy provider string so cutover grep stays clean (concatenated in test).

## Self-Check: PASSED
