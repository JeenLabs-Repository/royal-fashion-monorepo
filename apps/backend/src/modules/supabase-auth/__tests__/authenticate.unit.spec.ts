import SupabaseAuthProviderService from "../service"

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any

function createAuthIdentityService(seed?: Record<string, any>) {
  const store = new Map<string, any>(seed ? Object.entries(seed) : [])
  return {
    async retrieve({ entity_id }: { entity_id: string }) {
      const found = store.get(entity_id)
      if (!found) {
        const err: any = new Error("Not found")
        err.type = "not_found" // matches MedusaError.Types.NOT_FOUND string value
        throw err
      }
      return found
    },
    async create(data: any) {
      const identity = {
        id: `auth_${data.entity_id}`,
        provider_identities: [{ entity_id: data.entity_id }],
        ...data,
      }
      store.set(data.entity_id, identity)
      return identity
    },
    async update(entity_id: string, data: any) {
      const prev = store.get(entity_id) || { entity_id }
      const next = { ...prev, ...data, entity_id }
      store.set(entity_id, next)
      return next
    },
  }
}

describe("SupabaseAuthProviderService.authenticate", () => {
  it("returns success AuthIdentity for a valid mocked access_token", async () => {
    const verifyUser = jest.fn(async () => ({
      id: "supa-user-1",
      email: "shopper@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      user_metadata: { first_name: "Ada" },
    }))

    const provider = new SupabaseAuthProviderService(
      { logger },
      { supabaseUrl: "http://127.0.0.1:54321", apiKey: "test-key" },
      verifyUser as any
    )

    const authIdentityService = createAuthIdentityService()
    const result = await provider.authenticate(
      { body: { access_token: "valid.jwt" } } as any,
      authIdentityService as any
    )

    expect(result.success).toBe(true)
    expect(result.authIdentity).toBeDefined()
    expect(verifyUser).toHaveBeenCalledWith("valid.jwt")
    expect((result.authIdentity as any).user_metadata.email).toBe(
      "shopper@example.com"
    )
  })

  it("returns failure for an invalid token without throwing", async () => {
    const verifyUser = jest.fn(async () => {
      throw new Error("Invalid JWT")
    })

    const provider = new SupabaseAuthProviderService(
      { logger },
      { supabaseUrl: "http://127.0.0.1:54321", apiKey: "test-key" },
      verifyUser as any
    )

    const result = await provider.authenticate(
      { body: { access_token: "bad" } } as any,
      createAuthIdentityService() as any
    )

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Invalid JWT/)
  })

  it("rejects password registration (D-16)", async () => {
    const provider = new SupabaseAuthProviderService(
      { logger },
      { supabaseUrl: "http://127.0.0.1:54321", apiKey: "test-key" },
      (async () => ({ id: "x", email: "a@b.c" })) as any
    )

    const result = await provider.register()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/does not support password registration/)
  })
})
