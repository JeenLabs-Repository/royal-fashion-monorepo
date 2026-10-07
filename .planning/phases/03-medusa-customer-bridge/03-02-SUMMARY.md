---
phase: 03-medusa-customer-bridge
plan: 02
subsystem: auth
tags: [storefront, medusa-jwt, transferCart]

requires:
  - phase: 03-medusa-customer-bridge
    provides: supabase Auth provider on Medusa
provides:
  - Post-Supabase sdk.auth.login customer supabase access_token
  - setAuthToken + transferCart after customer bind
affects:
  - 05 hard cutover

actuals:
  tokens: 4200
  tasks: 2
  commits: 1

plan_head_before: cdbac16
plan_head_after: 1054ac0

tech-stack:
  added: []
  patterns:
    - bindMedusaCustomerSession after Supabase session
    - retrieve-or-create customer then transferCart

key-files:
  created: []
  modified:
    - apps/storefront/src/lib/data/customer.ts
    - apps/storefront/src/lib/data/__tests__/customer-auth.unit.spec.ts

key-decisions:
  - "Success state only after Medusa JWT + transferCart attempt"
  - "Re-login with supabase access_token after customer.create"

patterns-established:
  - "bindMedusaCustomerSession centralizes Store credential mint"

requirements-completed: [BRIDGE-02, BRIDGE-03]

coverage:
  - id: D1
    description: Supabase access_token exchanged via supabase provider; no emailpass
    requirement: BRIDGE-02
    verification:
      - kind: unit
        ref: customer-auth.unit.spec.ts#bridges Supabase access_token
        status: pass
    human_judgment: false
  - id: D2
    description: transferCart after setAuthToken
    requirement: BRIDGE-03
    verification:
      - kind: unit
        ref: customer-auth.unit.spec.ts#bridges
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-08
status: complete
---

# Phase 3 Plan 02: Storefront Medusa Bridge Summary

**After Supabase login/signup, storefront exchanges `access_token` for `_medusa_jwt`, ensures Customer, then runs `transferCart`.**

## Accomplishments

- `bindMedusaCustomerSession` implements D-13/D-14
- Signup with immediate session also binds Medusa
- Contract tests assert supabase login + no emailpass

## Task Commits

1. **Tasks 1–2:** `1054ac0`

## Deviations from Plan

None.

## Self-Check: PASSED
