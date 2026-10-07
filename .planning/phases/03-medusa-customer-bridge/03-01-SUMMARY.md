---
phase: 03-medusa-customer-bridge
plan: 01
subsystem: auth
tags: [medusa, supabase, auth-provider, workflow]

requires:
  - phase: 02-storefront-supabase-identity
    provides: Supabase access tokens after shopper login
provides:
  - AbstractAuthModuleProvider identifier supabase
  - exchange-supabase-customer workflow
  - medusa-config authMethodsPerActor.customer includes supabase
affects:
  - 03-02 storefront JWT exchange
  - 04 admin supabase login

actuals:
  tokens: 8500
  tasks: 3
  commits: 1

plan_head_before: acd34e9
plan_head_after: a27ac10

tech-stack:
  added: ["@supabase/supabase-js@2.117.3"]
  patterns:
    - authenticate({ access_token }) → getUser → AuthIdentity upsert by sub
    - Customer find-or-create + app_metadata.customer_id in workflow

key-files:
  created:
    - apps/backend/src/modules/supabase-auth/service.ts
    - apps/backend/src/modules/supabase-auth/index.ts
    - apps/backend/src/modules/supabase-auth/__tests__/authenticate.unit.spec.ts
    - apps/backend/src/workflows/exchange-supabase-customer.ts
    - apps/backend/src/workflows/steps/verify-supabase-access-token.ts
    - apps/backend/src/workflows/steps/ensure-customer-actor.ts
  modified:
    - apps/backend/medusa-config.ts
    - apps/backend/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Verify tokens with supabase.auth.getUser (HS256-local friendly); jose JWKS not added"
  - "customer authMethodsPerActor=[supabase]; user keeps emailpass until Phase 4/5"
  - "Customer link via workflow + storefront create; provider does not hash passwords"

patterns-established:
  - "Custom Auth ModuleProvider under src/modules/supabase-auth"

requirements-completed: [BRIDGE-01, BRIDGE-02]

coverage:
  - id: D1
    description: authenticate unit tests for valid/invalid token and register reject
    requirement: BRIDGE-02
    verification:
      - kind: unit
        ref: apps/backend/src/modules/supabase-auth/__tests__/authenticate.unit.spec.ts
        status: pass
    human_judgment: false
  - id: D2
    description: exchange-supabase-customer workflow ensures customer_id link
    requirement: BRIDGE-01
    verification:
      - kind: other
        ref: rg createWorkflow customer_id apps/backend/src/workflows
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-10-08
status: complete
---

# Phase 3 Plan 01: Medusa Supabase Auth Provider Summary

**Custom `supabase` Auth Module Provider verifies Supabase access tokens and a workflow find-or-creates Customers with `app_metadata.customer_id`.**

## Accomplishments

- `SupabaseAuthProviderService` with `authenticate` / rejected `register`
- Unit tests (3) pass under Jest
- `exchange-supabase-customer` workflow + verify/ensure steps
- `medusa-config.ts` registers provider; customer methods = `["supabase"]`

## Gaps / notes

- Auth provider API for post-auth customer create inside provider container is limited; storefront plan 03-02 completes actor bind via `sdk.auth.login` + customer create/retrieve + `transferCart`
- `updateAuthIdentities` API shape may vary by Medusa patch — ensure step catches failures

## Task Commits

1. **Tasks 1–3:** `a27ac10` — provider, tests, workflow, config, dependency

## Deviations from Plan

None material. jose not installed (getUser path only).

## Self-Check: PASSED
