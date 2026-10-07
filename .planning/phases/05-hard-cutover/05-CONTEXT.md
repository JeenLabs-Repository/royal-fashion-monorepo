# Phase 5 — Hard Cutover — Context

**Mode:** mvp  
**Requirements:** CUT-01, CUT-02, CUT-03  
**Depends on:** Phases 1–4 bridges live

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-22 | Remove all Medusa customer `emailpass` register/login/verify/reset from storefront and backend customer auth config — no silent fallback | Milestone success metric |
| D-23 | Remove or make unreachable Medusa Admin native password login after Supabase Admin path ships | Full Admin cutover |
| D-24 | `authMethodsPerActor` for customer and user lists only `supabase` | STACK prescribed |
| D-25 | No password hash migration; existing Medusa password users get re-register / Supabase reset messaging | PROJECT constraint |
| D-26 | Invalidate old Medusa JWTs for auth entry (clear cookies on logout paths + document JWT_SECRET rotate option for force invalidate) | Prevent orphan emailpass tokens |

## Deferred Ideas

- Auth cutover kill-switch / traffic metrics (AUTH-V2-04)
- Automated full e2e suite as release gate (AUTH-V2-05)
- Production hosted Supabase cutover playbook beyond env

## Claude's Discretion

- Whether to rotate `JWT_SECRET` automatically in dev — **document as optional operator step**, do not rotate silently in shared envs
- Copy tone for cutover banners — concise, actionable

## Success Lock

Zero Medusa password auth entry points remain; old JWTs cannot grant new auth entry; users see re-register/reset guidance.
