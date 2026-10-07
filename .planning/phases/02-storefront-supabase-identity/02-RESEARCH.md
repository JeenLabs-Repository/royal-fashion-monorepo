# Phase 2 Research — Storefront Supabase Identity

**Confidence:** HIGH (official password + SSR confirm flows)  
**Distilled from:** research SUMMARY/STACK, INTEGRATIONS.md auth surface, `customer.ts`

## Current brownfield surface

- `apps/storefront/src/lib/data/customer.ts`: `signup` / `login` / `completeLogin` / `signout` use `sdk.auth.*("emailpass")`
- Verify UI: `apps/storefront/src/app/[countryCode]/(main)/verify-account/`
- Account parallel routes: `@login` under account
- Cookies: `_medusa_jwt`, `_medusa_pending_customer`

## Target identity UX

| Flow | API | Notes |
|------|-----|-------|
| Register | `supabase.auth.signUp({ email, password })` | Server Action; set SSR cookies |
| Login | `signInWithPassword` | Server Action |
| Logout | `signOut` + clear any Medusa token helpers already present | Clear both sessions when Medusa token exists |
| Verify | Email link → confirm route `exchangeCodeForSession` / `verifyOtp` | Pin `enable_confirmations` in config.toml |
| Reset | `resetPasswordForEmail` + update password on recovery session | Shared confirm/recovery route |

## Architecture

Phase 2 owns **identity only**. After successful Supabase auth, do **not** call `sdk.auth.login("customer","emailpass")`. Optional stub comment that Phase 3 will call `sdk.auth.login("customer","supabase",{ access_token })`.

## Pitfalls

- Leaving Medusa verification pages that still call `sdk.auth.verification.*`
- Redirect URL mismatches for local Mailpit links
- Treating Phase 2 login as Store API ready (it is not until Phase 3)

## Out of scope

Custom Medusa Auth provider, customer create, `transferCart` rewire, Admin login.
