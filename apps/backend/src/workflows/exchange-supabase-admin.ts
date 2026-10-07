import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ensureAdminUserActorStep,
  type EnsureAdminUserActorResult,
} from "./steps/ensure-admin-user-actor"
import {
  verifySupabaseAccessTokenStep,
  type VerifiedSupabaseUser,
} from "./steps/verify-supabase-access-token"

export type ExchangeSupabaseAdminInput = {
  access_token: string
  auth_identity_id?: string
}

export type ExchangeSupabaseAdminOutput = {
  user: VerifiedSupabaseUser
  admin: EnsureAdminUserActorResult
}

/**
 * Verifies Supabase token and links to an existing Medusa User (ADMIN-02).
 * Does not create User rows — bootstrap/invite required (D-20).
 */
export const exchangeSupabaseAdminWorkflow = createWorkflow(
  "exchange-supabase-admin",
  (input: ExchangeSupabaseAdminInput) => {
    const user = verifySupabaseAccessTokenStep({
      access_token: input.access_token,
    })

    const admin = ensureAdminUserActorStep({
      user,
      auth_identity_id: input.auth_identity_id,
    })

    return new WorkflowResponse({
      user,
      admin,
    })
  }
)

export default exchangeSupabaseAdminWorkflow
