import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser Supabase client (Client Components only).
 * Uses publishable/anon key — never a service-role secret.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon alias ok)"
    )
  }

  return createBrowserClient(url, key)
}
