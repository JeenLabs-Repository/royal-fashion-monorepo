import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server Supabase client for RSC / Server Actions / Route Handlers.
 * Authorize with getUser() or getClaims() — never getSession() alone.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon alias ok)"
    )
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component where cookies cannot be set;
          // middleware refresh is responsible for writing session cookies.
        }
      },
    },
  })
}

/**
 * Verified user for authz decisions (revalidates JWT; do not use getSession alone).
 */
export async function getUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }
  return data.user
}
