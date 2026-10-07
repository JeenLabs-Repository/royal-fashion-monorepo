# Auth hard cutover

Medusa-native password authentication is **removed**. Supabase Auth is the only IdP for shoppers and Admin operators.

## What changed

| Actor | Login | Password store |
|-------|-------|----------------|
| Customer (storefront) | Supabase → Medusa provider `supabase` → `_medusa_jwt` | Supabase only |
| Admin (`/app`) | `/app/supabase-login` → Medusa provider `supabase` → session cookie | Supabase only |

`authMethodsPerActor` is `customer: ["supabase"]` and `user: ["supabase"]`. Restoring the old Medusa password provider requires an explicit config revert and a new security review.

## Existing Medusa password users (CUT-03)

There is **no hash migration**. Users who only had Medusa passwords must:

1. **Re-register** on the storefront with the same email, or
2. Use **Forgot password** to receive a Supabase reset email (Mailpit locally)

Storefront login/register copy states that previous Medusa passwords no longer work.

## Invalidate old Medusa JWTs (D-26)

After deploy:

1. Ask clients to log out (clears Supabase cookies + `_medusa_jwt` via storefront `signout`)
2. Optionally **rotate `JWT_SECRET`** (and restart Medusa) so any lingering `_medusa_jwt` cookies fail signature checks
3. Clear browser cookies for the storefront/Admin domains if needed

Admin session cookies follow Medusa session auth; signing out of Admin + rotating secrets invalidates stale sessions.

## Admin bootstrap

First operators: [admin-supabase-bootstrap.md](./admin-supabase-bootstrap.md).

## Rollback note

Re-enabling Medusa password auth is a milestone-level decision — do not add it back “temporarily” in production.
