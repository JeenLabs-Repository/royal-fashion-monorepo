import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ensureCustomerActorStep,
  type EnsureCustomerActorResult,
} from "./steps/ensure-customer-actor"
import {
  verifySupabaseAccessTokenStep,
  type VerifiedSupabaseUser,
} from "./steps/verify-supabase-access-token"

export type ExchangeSupabaseCustomerInput = {
  access_token: string
  auth_identity_id?: string
}

export type ExchangeSupabaseCustomerOutput = {
  user: VerifiedSupabaseUser
  customer: EnsureCustomerActorResult
}

/**
 * Verifies Supabase access_token and ensures a linked Medusa Customer
 * with app_metadata.customer_id (BRIDGE-01).
 */
export const exchangeSupabaseCustomerWorkflow = createWorkflow(
  "exchange-supabase-customer",
  (input: ExchangeSupabaseCustomerInput) => {
    const user = verifySupabaseAccessTokenStep({
      access_token: input.access_token,
    })

    const customer = ensureCustomerActorStep({
      user,
      auth_identity_id: input.auth_identity_id,
    })

    return new WorkflowResponse({
      user,
      customer,
    })
  }
)

export default exchangeSupabaseCustomerWorkflow
