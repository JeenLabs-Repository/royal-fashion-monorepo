# Roadmap: Royal Fashion — Supabase Auth Migration

## Overview

Replace all native Medusa password auth (storefront customer `emailpass` and Admin login) with Supabase Auth email/password only, while Medusa remains the commerce and admin-actor authority. Delivery follows a hard-cutover path: local Supabase + SSR session foundation → shopper identity UX → Medusa customer bridge and cart transfer → Admin Supabase login and user actor → remove every Medusa password path with clear re-register/reset messaging. Research Phase 6 (hardening/tests/kill-switch) folds into Phase 5 for MVP; those extras stay in v2 requirements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Supabase Local + SSR Foundation** - Local Auth host, env boundaries, durable SSR cookies
- [ ] **Phase 2: Storefront Supabase Identity** - Register, login, logout, verify, and password reset via Supabase
- [ ] **Phase 3: Medusa Customer Bridge** - Link Medusa customer, Store credential, guest cart transfer
- [ ] **Phase 4: Admin Supabase Login** - Operator Supabase login with Medusa user actor session
- [ ] **Phase 5: Hard Cutover** - Remove Medusa password auth; invalidate old JWTs; cutover messaging

## Phase Details

### Phase 1: Supabase Local + SSR Foundation

**Goal:** Developers and the storefront can use self-hosted Supabase Auth with durable SSR sessions and safe key boundaries
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** SESS-01, SESS-02, SESS-03
**Success Criteria** (what must be TRUE):
  1. Operator can start local Supabase and reach Auth at `http://127.0.0.1:54321` using documented env vars for storefront and backend
  2. Authenticated shopper session survives refresh and navigation via `@supabase/ssr` cookies; auth decisions use `getUser()` (not `getSession` alone)
  3. Service-role / secret Supabase keys never appear in `NEXT_PUBLIC_*` or browser-visible bundles

**Plans:** 1 plan

Plans:
- [ ] 01-01-PLAN.md — Local Supabase + SSR clients, env boundaries, middleware refresh (SESS-01..03)

### Phase 2: Storefront Supabase Identity

**Goal:** Shoppers can create accounts, sign in/out, verify email, and reset passwords entirely through Supabase Auth
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Shopper can create an account with email and password via Supabase Auth (not Medusa `emailpass`)
  2. Shopper can log in with email and password via Supabase Auth
  3. Shopper can log out and lose storefront authenticated access on that device
  4. Shopper can complete email verification via Supabase confirm flow under the configured local/prod confirmation policy
  5. Shopper can request a password reset email and set a new password via Supabase recovery

**Plans:** 2/2 plans executed
**UI hint:** yes

Plans:
- [x] 02-01-PLAN.md — Register/login/logout via Supabase Server Actions (AUTH-01..03)
- [x] 02-02-PLAN.md — Email confirm + password reset; retire Medusa verify UX (AUTH-04..05)

### Phase 3: Medusa Customer Bridge

**Goal:** After Supabase auth, shoppers become Medusa customers with working Store API access and preserved guest carts
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** BRIDGE-01, BRIDGE-02, BRIDGE-03
**Success Criteria** (what must be TRUE):
  1. After Supabase auth, the system finds or creates a Medusa Customer linked by email and/or Supabase user id
  2. Authenticated Store API calls succeed with a Medusa customer credential/session (not Supabase-only Store calls)
  3. Guest cart transfers to the authenticated customer after successful Medusa customer bind

**Plans:** 2/2 plans executed

Plans:
- [x] 03-01-PLAN.md — Custom `supabase` Auth provider + customer link workflow (BRIDGE-01..02)
- [x] 03-02-PLAN.md — Storefront token exchange + transferCart (BRIDGE-02..03)

### Phase 4: Admin Supabase Login

**Goal:** Operators can enter Medusa Admin via Supabase email/password with a usable Medusa user actor session
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. Operator can log into Medusa Admin with Supabase email/password (not Medusa-native password login)
  2. After Supabase Admin login, Admin APIs and `/app` work under an established Medusa `user` actor session
  3. Operator can provision the first admins using a documented bootstrap/invite-then-link runbook (no chicken-and-egg lockout)

**Plans:** 2/2 plans executed
**UI hint:** yes

Plans:
- [x] 04-01-PLAN.md — Admin Supabase login UI + user actor session (ADMIN-01..02)
- [x] 04-02-PLAN.md — Bootstrap/invite-then-link runbook + helper script (ADMIN-03)

### Phase 5: Hard Cutover

**Goal:** Medusa password auth is gone for customers and Admin; existing password users get clear re-register/reset guidance
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** CUT-01, CUT-02, CUT-03
**Success Criteria** (what must be TRUE):
  1. All Medusa customer `emailpass` register/login/verify/reset paths are removed from storefront and config (no silent fallback)
  2. Medusa Admin native password login is removed or unreachable after the Supabase Admin path ships
  3. Existing Medusa password users see re-register / Supabase reset messaging (no hash migration); old Medusa JWTs no longer grant auth entry

**Plans:** 1/1 plans executed

Plans:
- [x] 05-01-PLAN.md — Remove emailpass, Admin password entry, cutover messaging + JWT invalidate (CUT-01..03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Supabase Local + SSR Foundation | 1/1 | Complete | 2026-10-08 |
| 2. Storefront Supabase Identity | 2/2 | In Progress | - |
| 3. Medusa Customer Bridge | 2/2 | In Progress | - |
| 4. Admin Supabase Login | 2/2 | In Progress | - |
| 5. Hard Cutover | 1/1 | In Progress | - |

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| SESS-01 | Phase 1 |
| SESS-02 | Phase 1 |
| SESS-03 | Phase 1 |
| AUTH-01 | Phase 2 |
| AUTH-02 | Phase 2 |
| AUTH-03 | Phase 2 |
| AUTH-04 | Phase 2 |
| AUTH-05 | Phase 2 |
| BRIDGE-01 | Phase 3 |
| BRIDGE-02 | Phase 3 |
| BRIDGE-03 | Phase 3 |
| ADMIN-01 | Phase 4 |
| ADMIN-02 | Phase 4 |
| ADMIN-03 | Phase 4 |
| CUT-01 | Phase 5 |
| CUT-02 | Phase 5 |
| CUT-03 | Phase 5 |

**Coverage:** 17/17 v1 requirements mapped ✓
