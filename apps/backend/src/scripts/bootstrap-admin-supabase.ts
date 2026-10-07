import { ExecArgs } from "@medusajs/framework/types"
import { createClient } from "@supabase/supabase-js"

/**
 * Server-only helper: create or fetch a Supabase Auth user by email.
 * Does not create Medusa User rows and never logs privileged key values.
 *
 * Usage (Medusa exec):
 *   pnpm exec medusa exec ./src/scripts/bootstrap-admin-supabase.ts --email admin@example.com
 *
 * Optional password via env BOOTSTRAP_ADMIN_PASSWORD (default random placeholder printed once).
 */
export default async function bootstrapAdminSupabase({ args }: ExecArgs) {
  const emailFlagIndex = args.findIndex((a) => a === "--email")
  const email =
    emailFlagIndex >= 0 ? args[emailFlagIndex + 1] : process.env.BOOTSTRAP_ADMIN_EMAIL

  if (!email) {
    throw new Error("Pass --email <address> or set BOOTSTRAP_ADMIN_EMAIL")
  }

  const url = process.env.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) are required"
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const password =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    `ChangeMe-${Math.random().toString(36).slice(2, 10)}!`

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`)
  }

  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existing) {
    console.log(
      JSON.stringify(
        {
          status: "exists",
          email,
          supabase_user_id: existing.id,
          next: [
            "Ensure Medusa User exists: pnpm exec medusa user -e <email> -p <temp>",
            "Sign in at /app/supabase-login with the Supabase password for this user",
          ],
        },
        null,
        2
      )
    )
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message || "unknown"}`)
  }

  console.log(
    JSON.stringify(
      {
        status: "created",
        email,
        supabase_user_id: data.user.id,
        temporary_password_set: !process.env.BOOTSTRAP_ADMIN_PASSWORD,
        temporary_password: process.env.BOOTSTRAP_ADMIN_PASSWORD
          ? undefined
          : password,
        next: [
          "Ensure Medusa User exists: pnpm exec medusa user -e <email> -p <temp>",
          "Sign in at /app/supabase-login",
          "Rotate the temporary password in Supabase if one was generated",
        ],
      },
      null,
      2
    )
  )
}
