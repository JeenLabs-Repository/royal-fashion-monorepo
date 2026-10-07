import { createClient } from "@supabase/supabase-js"

/**
 * Browser Supabase client for Admin UI — publishable/anon key only.
 * Never import privileged Supabase secret keys into Admin UI bundles.
 */
export function createAdminSupabaseClient() {
  const url =
    import.meta.env.VITE_MEDUSA_ADMIN_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    ""
  const key =
    import.meta.env.VITE_MEDUSA_ADMIN_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ""

  if (!url || !key) {
    throw new Error(
      "Missing VITE_MEDUSA_ADMIN_SUPABASE_URL / VITE_MEDUSA_ADMIN_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_* aliases)"
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
