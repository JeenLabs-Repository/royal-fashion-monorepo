import { sdk } from "../../lib/sdk"
import { createAdminSupabaseClient } from "../../lib/supabase"

export type AdminSupabaseLoginResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Supabase email/password → Medusa user actor session (ADMIN-01 / D-17 / D-18).
 */
export async function loginAdminWithSupabase(
  email: string,
  password: string
): Promise<AdminSupabaseLoginResult> {
  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session?.access_token) {
      return {
        ok: false,
        error: error?.message || "Supabase sign-in failed",
      }
    }

    await sdk.auth.login("user", "supabase", {
      access_token: data.session.access_token,
    })

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
