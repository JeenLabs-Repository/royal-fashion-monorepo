import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { VerifiedSupabaseUser } from "./verify-supabase-access-token"

export type EnsureAdminUserActorInput = {
  user: VerifiedSupabaseUser
  auth_identity_id?: string
}

export type EnsureAdminUserActorResult = {
  user_id: string
}

/**
 * Link AuthIdentity to an **existing** Medusa User by email (D-19 / D-20).
 * Never elevates from user_metadata or creates Admin by email alone.
 */
export const ensureAdminUserActorStep = createStep(
  "ensure-admin-user-actor",
  async (input: EnsureAdminUserActorInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "email"],
      filters: { email: input.user.email },
    })

    const medusaUser = users?.[0]
    if (!medusaUser?.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `No Medusa User exists for ${input.user.email}. Provision the User row first (bootstrap runbook), then retry.`
      )
    }

    const user_id = medusaUser.id as string

    if (input.auth_identity_id) {
      try {
        const authModule = container.resolve(Modules.AUTH)
        await authModule.updateAuthIdentities([
          {
            id: input.auth_identity_id,
            app_metadata: {
              user_id,
            },
          },
        ])
      } catch {
        // Link may be completed by Medusa auth actor attach on first successful login
      }
    }

    return new StepResponse({ user_id } satisfies EnsureAdminUserActorResult)
  }
)
