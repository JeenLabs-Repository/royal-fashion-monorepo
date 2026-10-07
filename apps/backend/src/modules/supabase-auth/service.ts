import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import {
  AbstractAuthModuleProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

type InjectedDependencies = {
  logger: Logger
}

type Options = {
  supabaseUrl?: string
  apiKey?: string
}

type VerifyUserFn = (accessToken: string) => Promise<User>

/**
 * Medusa Auth Module Provider that exchanges a Supabase access_token
 * for an AuthIdentity (no password hashing — D-11, D-16).
 */
class SupabaseAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "supabase"
  static DISPLAY_NAME = "Supabase Authentication"

  protected logger_: Logger
  protected supabase_: SupabaseClient | null = null
  protected verifyUser_: VerifyUserFn

  static validateOptions(options: Options) {
    const url = options.supabaseUrl || process.env.SUPABASE_URL
    const key =
      options.apiKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error(
        "Supabase auth provider requires SUPABASE_URL and a server key (service_role preferred)"
      )
    }
  }

  constructor(
    { logger }: InjectedDependencies,
    options: Options,
    verifyUser?: VerifyUserFn
  ) {
    // @ts-ignore
    super(...arguments)
    this.logger_ = logger

    if (verifyUser) {
      this.verifyUser_ = verifyUser
      return
    }

    const url = options.supabaseUrl || process.env.SUPABASE_URL!
    const key =
      options.apiKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY!

    this.supabase_ = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    this.verifyUser_ = async (accessToken: string) => {
      const { data, error } = await this.supabase_!.auth.getUser(accessToken)
      if (error || !data.user) {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          error?.message || "Invalid Supabase access token"
        )
      }
      return data.user
    }
  }

  async register(): Promise<AuthenticationResponse> {
    return {
      success: false,
      error:
        "Supabase provider does not support password registration. Register via Supabase Auth, then authenticate with access_token.",
    }
  }

  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const body = (req.body ?? {}) as Record<string, unknown>
    const accessToken = body.access_token

    if (!accessToken || typeof accessToken !== "string") {
      return {
        success: false,
        error: "access_token is required",
      }
    }

    let user: User
    try {
      user = await this.verifyUser_(accessToken)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      }
    }

    if (!user.id) {
      return { success: false, error: "Supabase user missing id" }
    }

    if (!user.email) {
      return {
        success: false,
        error: "Supabase user email is required to link a Medusa customer",
      }
    }

    const entity_id = user.id
    const userMetadata = {
      email: user.email,
      email_verified: Boolean(user.email_confirmed_at),
      // Non-authz profile fields only — never use for authorization
      first_name: (user.user_metadata as Record<string, unknown> | undefined)
        ?.first_name,
      last_name: (user.user_metadata as Record<string, unknown> | undefined)
        ?.last_name,
      phone: (user.user_metadata as Record<string, unknown> | undefined)?.phone,
    }

    let authIdentity
    try {
      authIdentity = await authIdentityService.retrieve({ entity_id })
      authIdentity = await authIdentityService.update(entity_id, {
        user_metadata: {
          ...(authIdentity.user_metadata || {}),
          ...userMetadata,
        },
      })
    } catch (error: any) {
      const isNotFound =
        error?.type === MedusaError.Types.NOT_FOUND ||
        error?.type === "not_found"
      if (isNotFound) {
        authIdentity = await authIdentityService.create({
          entity_id,
          user_metadata: userMetadata,
          // customer_id is set by exchange-supabase-customer / storefront create
          app_metadata: {},
        })
      } else {
        return {
          success: false,
          error: error?.message || "Failed to upsert auth identity",
        }
      }
    }

    // Identity is ready for Store JWT mint. Customer actor link
    // (app_metadata.customer_id) is completed by exchange-supabase-customer
    // workflow / ensureCustomer via storefront customer.create (Phase 3-02).
    return {
      success: true,
      authIdentity,
    }
  }
}

export default SupabaseAuthProviderService
