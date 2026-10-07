# Phase 4 — Admin Supabase Login — Context

**Mode:** mvp  
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03  
**Depends on:** Phase 3 customer provider pattern

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-17 | Admin operators authenticate with Supabase email/password (same Auth project) | PROJECT full replacement including Admin |
| D-18 | After Supabase Admin login, establish Medusa `user` actor session (`auth: { type: "session" }`) via provider `supabase` | Admin SDK session model |
| D-19 | Never grant Admin by email alone or via `user_metadata` roles | Security checklist |
| D-20 | First operators provisioned via documented bootstrap/invite-then-link runbook (create Medusa User row + Supabase user, link `app_metadata.user_id`) | Avoid chicken-and-egg |
| D-21 | Custom Admin login entry (Admin UI route) performs Supabase sign-in + `/auth/user/supabase` exchange; stock emailpass login becomes unreachable in Phase 5 | Architecture Admin spike outcome default |

## Deferred Ideas

- Full Admin product UI redesign
- Enterprise SSO
- Kill-switch metrics (v2)

## Claude's Discretion

- Exact Admin route path under `apps/backend/src/admin/` — prefer `routes/supabase-login` or replace login widget per Medusa admin customization skill
- Whether to auto-create User on first allowlisted login vs require pre-provision — **require pre-provision / bootstrap** per D-20 (safer)

## Success Lock

Operator logs into `/app` via Supabase and Medusa user session without Medusa-native password login as the happy path.
