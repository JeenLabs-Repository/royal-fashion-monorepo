---
phase: 02-storefront-supabase-identity
plan: 02
subsystem: auth
tags: [supabase, pkce, password-reset, email-confirm]

requires:
  - phase: 02-storefront-supabase-identity
    provides: Supabase signup/login Server Actions
provides:
  - auth/confirm PKCE + verifyOtp route
  - forgot/reset password Server Actions and pages
  - Retired Medusa verify-account shopper path
affects:
  - 03 Medusa customer bridge

actuals:
  tokens: 6200
  tasks: 3
  commits: 1

plan_head_before: 3fad805c92cbc8db683c4b719d1a0f7c400ef230
plan_head_after: e8242e5

tech-stack:
  added: []
  patterns:
    - Confirm route exchanges code or token_hash via server createClient
    - Password reset uses resetPasswordForEmail → confirm → updateUser

key-files:
  created:
    - apps/storefront/src/app/[countryCode]/(main)/auth/confirm/route.ts
    - apps/storefront/src/app/[countryCode]/(main)/account/forgot-password/page.tsx
    - apps/storefront/src/app/[countryCode]/(main)/account/reset-password/page.tsx
  modified:
    - apps/storefront/src/lib/data/customer.ts
    - apps/storefront/src/app/[countryCode]/(main)/verify-account/page.tsx
    - apps/storefront/src/modules/account/components/verify-account/index.tsx
    - apps/storefront/src/modules/account/components/login/index.tsx
    - supabase/config.toml
    - README.md

key-decisions:
  - "Local enable_confirmations=false; production must enable confirmations + SMTP"
  - "Recovery type redirects to reset-password; signup confirm to account"

patterns-established:
  - "Country-coded /auth/confirm as single PKCE entry"

requirements-completed: [AUTH-04, AUTH-05]

coverage:
  - id: D1
    description: Confirm route exchanges Supabase code/token_hash
    requirement: AUTH-04
    verification:
      - kind: other
        ref: rg exchangeCodeForSession|verifyOtp apps/storefront/src/app
        status: pass
    human_judgment: false
  - id: D2
    description: Password reset request and update via Supabase
    requirement: AUTH-05
    verification:
      - kind: other
        ref: rg resetPasswordForEmail|updateUser customer.ts
        status: pass
    human_judgment: false
  - id: D3
    description: No sdk.auth.verification in storefront
    requirement: AUTH-04
    verification:
      - kind: other
        ref: rg sdk.auth.verification apps/storefront/src (expect none)
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-08
status: complete
---

# Phase 2 Plan 02: Email Confirm + Password Reset Summary

**Shoppers verify email and reset passwords through Supabase confirm/PKCE and recovery flows; Medusa verify-account is retired.**

## Accomplishments

- Added `/{countryCode}/auth/confirm` route using `exchangeCodeForSession` / `verifyOtp`
- Pinned local `enable_confirmations=false` and documented prod policy in README + config.toml
- Added `requestPasswordReset` / `updatePassword` + forgot/reset pages; login links to forgot-password
- Replaced verify-account with static guidance (no Medusa verification SDK)

## Task Commits

1. **Tasks 1–3:** `e8242e5` — confirm route, reset UX, verify-account retirement, config/README

## Deviations from Plan

None material. Wildcard redirect URLs `http://127.0.0.1:8000/**` added for country-coded confirm paths.

## Self-Check: PASSED

- FOUND: auth/confirm/route.ts, forgot-password, reset-password pages
- FOUND: commit e8242e5
