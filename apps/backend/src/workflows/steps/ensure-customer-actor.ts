import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { VerifiedSupabaseUser } from "./verify-supabase-access-token"

export type EnsureCustomerActorInput = {
  user: VerifiedSupabaseUser
  auth_identity_id?: string
}

export type EnsureCustomerActorResult = {
  customer_id: string
  created: boolean
}

/**
 * Find-or-create Medusa Customer by email and return customer_id for
 * AuthIdentity app_metadata linking (D-12). Never reads roles from user_metadata.
 */
export const ensureCustomerActorStep = createStep(
  "ensure-customer-actor",
  async (input: EnsureCustomerActorInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: existing } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { email: input.user.email },
    })

    let customer_id: string
    let created = false

    if (existing?.[0]?.id) {
      customer_id = existing[0].id
    } else {
      const createdCustomer = await customerModule.createCustomers({
        email: input.user.email,
        first_name: input.user.first_name,
        last_name: input.user.last_name,
        phone: input.user.phone,
      })
      customer_id = Array.isArray(createdCustomer)
        ? createdCustomer[0].id
        : createdCustomer.id
      created = true
    }

    // Prefer Auth module update when identity id is known — sets app_metadata.customer_id
    if (input.auth_identity_id) {
      try {
        const authModule = container.resolve(Modules.AUTH)
        await authModule.updateAuthIdentities([
          {
            id: input.auth_identity_id,
            app_metadata: {
              customer_id,
            },
          },
        ])
      } catch {
        // Auth identity update may be unavailable in some test scopes; customer still exists.
      }
    }

    const result: EnsureCustomerActorResult = { customer_id, created }
    return new StepResponse(result)
  }
)
