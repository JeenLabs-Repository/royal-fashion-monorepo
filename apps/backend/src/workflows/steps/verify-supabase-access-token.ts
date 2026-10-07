import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createClient } from "@supabase/supabase-js"
import { MedusaError } from "@medusajs/framework/utils"

export type VerifySupabaseAccessTokenInput = {
  access_token: string
}

export type VerifiedSupabaseUser = {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

/**
 * Verifies a Supabase access_token via auth.getUser (local HS256-friendly).
 */
export const verifySupabaseAccessTokenStep = createStep(
  "verify-supabase-access-token",
  async (input: VerifySupabaseAccessTokenInput) => {
    const url = process.env.SUPABASE_URL
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "SUPABASE_URL and a server key are required to verify access tokens"
      )
    }

    if (!input.access_token) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "access_token is required"
      )
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await supabase.auth.getUser(input.access_token)
    if (error || !data.user?.id || !data.user.email) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        error?.message || "Invalid Supabase access token"
      )
    }

    const meta = (data.user.user_metadata || {}) as Record<string, unknown>
    const verified: VerifiedSupabaseUser = {
      id: data.user.id,
      email: data.user.email,
      first_name: typeof meta.first_name === "string" ? meta.first_name : undefined,
      last_name: typeof meta.last_name === "string" ? meta.last_name : undefined,
      phone: typeof meta.phone === "string" ? meta.phone : undefined,
    }

    return new StepResponse(verified)
  }
)
