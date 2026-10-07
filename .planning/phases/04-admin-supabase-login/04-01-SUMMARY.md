---
phase: 04-admin-supabase-login
plan: 01
subsystem: auth
tags: [admin, supabase, medusa-user]

requires:
  - phase: 03-medusa-customer-bridge
    provides: supabase Auth provider
provides:
  - /app/supabase-login Admin UI
  - exchange-supabase-admin workflow (existing User only)
affects:
  - 04-02 bootstrap runbook
  - 05 hard cutover

actuals:
  tokens: 7000
  tasks: 3
  commits: 1

plan_head_before: 32f875d
plan_head_after: b907199

tech-stack:
  added: []
  patterns:
    - Admin Vite publishable Supabase client + session SDK login
    - ensure-admin-user-actor refuses missing User rows

key-files:
  created:
    - apps/backend/src/admin/routes/supabase-login/page.tsx
    - apps/backend/src/admin/routes/supabase-login/page.logic.ts
    - apps/backend/src/admin/lib/sdk.ts
    - apps/backend/src/admin/lib/supabase.ts
    - apps/backend/src/workflows/exchange-supabase-admin.ts
    - apps/backend/src/workflows/steps/ensure-admin-user-actor.ts
  modified:
    - apps/backend/medusa-config.ts
    - apps/backend/.env.template
    - README.md

key-decisions:
  - "user authMethodsPerActor includes supabase+emailpass until Phase 5"
  - "Admin login URL /app/supabase-login; stock login remains until cutover"
  - "No privileged Supabase keys in Admin UI sources"

patterns-established:
  - "page.logic.ts separates Admin login orchestration from UI"

requirements-completed: [ADMIN-01, ADMIN-02]

coverage:
  - id: D1
    description: Admin supabase-login uses signInWithPassword + user supabase login
    requirement: ADMIN-01
    verification:
      - kind: other
        ref: rg signInWithPassword apps/backend/src/admin/routes/supabase-login
        status: pass
    human_judgment: true
    rationale: Full /app session needs live backend + Supabase
  - id: D2
    description: ensure-admin-user-actor guards missing User
    requirement: ADMIN-02
    verification:
      - kind: other
        ref: rg NOT_ALLOWED ensure-admin-user-actor.ts
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-08
status: complete
---

# Phase 4 Plan 01: Admin Supabase Login Summary

**Operators can sign in at `/app/supabase-login` with Supabase credentials; user actor linking requires a pre-existing Medusa User.**

## Accomplishments

- Custom Admin UI route + logic (publishable Supabase client, session SDK)
- `exchange-supabase-admin` / `ensure-admin-user-actor` with hard refuse if no User
- CORS/env documented; no privileged keys under `src/admin`

## Gaps

- Custom Admin routes may still sit behind the stock login shell depending on Medusa Admin version — bootstrap doc notes `/app/supabase-login` as operator entry; validate in live Admin when Docker/Supabase available

## Task Commits

1. **Tasks 1–3:** `b907199`

## Self-Check: PASSED
