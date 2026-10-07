# Admin Supabase bootstrap (invite-then-link)

Provision the first operators so Admin login works **without** relying on Medusa-native passwords as the IdP (ADMIN-03 / D-20).

## Prerequisites

1. Docker Desktop running
2. Local Supabase: from repo root `pnpm supabase:start` (API `http://127.0.0.1:54321`)
3. Medusa backend env filled from `apps/backend/.env.template` (`DATABASE_URL`, `SUPABASE_*`, `VITE_MEDUSA_ADMIN_SUPABASE_*`)
4. `ADMIN_CORS` / `AUTH_CORS` include `http://localhost:9000` (and Vite admin origin if used)

## Ordered steps

### 1. Start Auth + commerce backends

```bash
pnpm supabase:start
pnpm backend:dev   # Admin usually at http://localhost:9000/app
```

### 2. Create a Medusa User row

Password here is **not** the login IdP after cutover — it only seeds the User record:

```bash
cd apps/backend
pnpm exec medusa user -e admin@example.com -p "temporary-not-used-for-idp"
```

### 3. Create a matching Supabase Auth user

**Option A — Studio:** open `http://127.0.0.1:54323` → Authentication → Add user (same email + real password).

**Option B — server script** (uses server-only privileged key; never commit secrets):

```bash
cd apps/backend
pnpm exec medusa exec ./src/scripts/bootstrap-admin-supabase.ts --email admin@example.com
```

Or with tsx if preferred by your environment (see script header). The script creates/fetches the Supabase user and prints next steps — it does **not** print secret key values and does **not** grant Admin without the Medusa User row from step 2.

### 4. Link via Admin login

1. Open `http://localhost:9000/app/supabase-login`
2. Sign in with the Supabase email/password
3. Medusa exchanges `access_token` via provider `supabase` for actor `user` and sets the Admin session cookie

### 5. Verify

- `/app` (e.g. Orders) loads while authenticated
- Signing out clears the Admin session; stock `/app/login` may still exist until Phase 5 hard cutover

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| “No Medusa User exists for …” | Step 2 skipped / email mismatch | Create User with exact email |
| Supabase sign-in fails | Wrong password / confirmations | Check Mailpit / Studio user |
| CORS / cookie errors | `ADMIN_CORS` / `AUTH_CORS` | Add Admin origin; restart Medusa |
| Auth provider unauthorized | Backend missing `SUPABASE_URL` / server key | Fill `.env` from `supabase status` |
| Can reach storefront but not Admin | Different emails for customer vs user | Keep actors separate; never elevate customer → user |

## Security notes

- Admin UI must use **publishable/anon** Vite env keys only
- Privileged Supabase keys stay on the Medusa server / operator shell
- Never grant Admin from `user_metadata` claims alone
