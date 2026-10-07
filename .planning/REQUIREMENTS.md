# Requirements: Royal Fashion — Supabase Auth Migration

**Defined:** 2026-10-08
**Core Value:** A shopper or admin can sign up / log in with email and password via Supabase, and Medusa still recognizes them for store or admin work — with zero remaining Medusa password auth paths.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Customer authentication (Supabase)

- [ ] **AUTH-01**: Shopper can create an account with email and password via Supabase Auth (not Medusa `emailpass`)
- [ ] **AUTH-02**: Shopper can log in with email and password via Supabase Auth
- [ ] **AUTH-03**: Shopper can log out and lose storefront authenticated access on that device
- [ ] **AUTH-04**: Shopper receives / completes email verification via Supabase (confirm route + configured local/prod confirmation policy)
- [ ] **AUTH-05**: Shopper can request a password reset email and set a new password via Supabase recovery flow

### Session & storefront plumbing

- [ ] **SESS-01**: Authenticated shopper session persists across refresh/navigation using `@supabase/ssr` cookies; auth decisions use `getUser()` (not `getSession` alone)
- [ ] **SESS-02**: Self-hosted Supabase local defaults (`http://127.0.0.1:54321`) and required env vars are documented and wired for storefront + backend
- [ ] **SESS-03**: Service-role / secret Supabase keys never appear in `NEXT_PUBLIC_*` or browser bundles

### Medusa customer bridge

- [ ] **BRIDGE-01**: After Supabase auth, system finds or creates a Medusa Customer linked by email and/or Supabase user id
- [ ] **BRIDGE-02**: Authenticated Store API calls succeed with a Medusa customer credential/session (bridge after Supabase login; not Supabase-only Store calls)
- [ ] **BRIDGE-03**: Guest cart transfers to the authenticated customer after successful Medusa customer bind (existing `transferCart` contract preserved)

### Admin authentication

- [ ] **ADMIN-01**: Operator can log into Medusa Admin with Supabase email/password (not Medusa-native password login)
- [ ] **ADMIN-02**: After Supabase Admin login, a Medusa `user` actor session is established so Admin APIs/`/app` work
- [ ] **ADMIN-03**: Admin bootstrap/invite-then-link runbook exists so first operators can be provisioned without chicken-and-egg

### Hard cutover

- [ ] **CUT-01**: All Medusa customer `emailpass` register/login/verify/reset paths are removed from storefront and config (no silent fallback)
- [ ] **CUT-02**: Medusa Admin native password login is removed or unreachable after Supabase Admin path ships
- [ ] **CUT-03**: Existing Medusa password users are handled via re-register / Supabase reset messaging (no hash migration); old Medusa JWTs invalidated for auth entry

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Auth quality

- **AUTH-V2-01**: In-account password change UI wired to Supabase `updateUser`
- **AUTH-V2-02**: Resend verification email UX
- **AUTH-V2-03**: Explicit durable `supabase_user_id` map + `app_metadata` role split hardening
- **AUTH-V2-04**: Auth cutover kill-switch / traffic proof metrics
- **AUTH-V2-05**: Automated register/verify/login/transfer/admin tests (storefront + HTTP)

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth / social / magic-link / 2FA | Explicit v1 mandate: email/password only |
| Migrate Medusa password hashes into Supabase | Crypto mismatch; force reset / re-register instead |
| Dual-run Medusa `emailpass` + Supabase | Dual IdP is a critical failure mode |
| Browser-exposed `service_role` | Security; server-only secrets |
| Commerce without Medusa customer/admin actors | Store/Admin APIs require Medusa actors |
| Rebuild Admin product UI beyond login/identity | Scope creep |
| Production Supabase host selection beyond env-ready config | Dev is self-hosted local; prod host deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESS-01 | Phase 1 | Pending |
| SESS-02 | Phase 1 | Pending |
| SESS-03 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| BRIDGE-01 | Phase 3 | Pending |
| BRIDGE-02 | Phase 3 | Pending |
| BRIDGE-03 | Phase 3 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| CUT-01 | Phase 5 | Pending |
| CUT-02 | Phase 5 | Pending |
| CUT-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-08*
*Last updated: 2026-10-08 after roadmap creation*
