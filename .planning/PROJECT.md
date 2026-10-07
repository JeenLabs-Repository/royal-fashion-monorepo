# Royal Fashion — Supabase Auth Migration

## What This Is

A brownfield Medusa DTC monorepo (`apps/backend` + `apps/storefront`) for Royal Fashion commerce. This milestone replaces **all native Medusa authentication** (storefront customer `emailpass` and Admin user login) with **Supabase Auth email/password only**, using self-hosted Supabase in development (local defaults + MCP). Commerce (customers, carts, orders) stays on Medusa; identity and passwords live in Supabase.

## Core Value

A shopper or admin can sign up / log in with email and password via Supabase, and Medusa still recognizes them for store or admin work — with zero remaining Medusa password auth paths.

## Business Context

- **Customer**: Royal Fashion storefront shoppers + internal Admin operators
- **Revenue model**: Existing DTC commerce (unchanged this milestone)
- **Success metric**: Login/register/logout/verify/reset work via Supabase only; Medusa `emailpass` / native password auth fully removed from storefront and Admin entry
- **Strategy notes**: Auth cutover milestone on existing Medusa starter; OAuth/social deferred

## Requirements

### Validated

- ✓ Medusa 2.x backend + Next.js storefront monorepo (pnpm/Turbo) — existing
- ✓ Storefront customer flows via Medusa JS SDK (`emailpass` JWT in `_medusa_jwt`) — existing (to be removed)
- ✓ Customer register / login / verify / logout / cart transfer — existing (to be rewired)
- ✓ Medusa Admin users via native Medusa auth (`medusa user`) — existing (to be rewired)
- ✓ PostgreSQL commerce data, Stripe-like checkout, product search — existing (unchanged)

### Active

- [ ] Remove all native Medusa customer `emailpass` auth usage from storefront and backend customer-auth paths
- [ ] Add Supabase Auth (email/password) for storefront: register, login, logout, email verification, password reset
- [ ] After Supabase auth, create/link Medusa customer by email (and/or Supabase user id metadata) so Store API calls remain customer-scoped
- [ ] Replace Medusa Admin password login with Supabase Auth (email/password), then establish a usable Medusa admin session/actor
- [ ] Wire self-hosted Supabase (dev defaults `http://127.0.0.1:54321`) via env; use Supabase MCP where helpful for schema/auth checks
- [ ] Drop Medusa-native verification/reset UI/flows in favor of Supabase equivalents
- [ ] Preserve guest cart → authenticated cart transfer after Supabase login
- [ ] Document env vars and local runbook for Supabase + Medusa + storefront

### Out of Scope

- Social / OAuth / magic-link / 2FA — v1 is email/password only
- Migrating existing Medusa password hashes into Supabase — no password carryover in v1
- Changing payments, catalog, search, or order pipelines (except auth headers/session plumbing)
- Production-hosted Supabase provider choice beyond env-ready config (dev is self-hosted local)
- Replacing Medusa Admin UI product features (only the login/identity path)

## Context

- Codebase map: `.planning/codebase/` (2026-10-08) — auth surface centered on `apps/storefront/src/lib/data/customer.ts`, cookies in `cookies.ts`, account parallel routes, Medusa Auth module `emailpass`
- Current session model: httpOnly `_medusa_jwt` + publishable key; auth identity ≠ customer actor until `customer.create`
- Supabase Auth becomes source of truth for credentials; Medusa remains source of truth for commerce entities
- Self-hosted Supabase in development; `user-supabase` MCP available
- CONCERNS.md already flags Medusa customer auth as high priority for this migration

## Constraints

- **Tech stack**: Stay on Medusa 2.21 + Next.js 15 storefront + pnpm workspace — no greenfield rewrite
- **Auth methods**: Email/password only in v1
- **Dev identity host**: Self-hosted Supabase local defaults (`127.0.0.1:54321`)
- **Commerce link**: Must create/link Medusa customer (and admin actor) from Supabase user — not commerce-without-Medusa-customer
- **Removal**: Native Medusa password auth must be fully removed, not left as fallback
- **Migration**: No existing password import in v1
- **Security**: Prefer httpOnly cookies / server-side session handling; do not expose service-role keys to the browser

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth only (email/password) | User mandate; remove Medusa native auth | — Pending |
| Storefront + Admin both on Supabase | User chose full replacement including Admin | — Pending |
| Link Medusa customer/admin from Supabase user | Keep Medusa commerce/admin APIs working | — Pending |
| Verification & reset via Supabase only | Avoid dual auth systems | — Pending |
| No password migration in v1 | Early/staging; simpler cutover | — Pending |
| Self-hosted Supabase local defaults in dev | User environment + MCP | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-08 after initialization*
