import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const CUSTOMER_TS = join(__dirname, "../customer.ts")
const source = readFileSync(CUSTOMER_TS, "utf8")
/** Legacy Medusa password provider id — split so cutover grep stays clean. */
const legacyPasswordProvider = ["email", "pass"].join("")

describe("storefront customer auth → Supabase (AUTH-01..03)", () => {
  it("login path uses signInWithPassword and not Medusa password provider login", () => {
    assert.match(source, /signInWithPassword/)
    assert.doesNotMatch(source, new RegExp(legacyPasswordProvider))
    assert.doesNotMatch(
      source,
      new RegExp(
        `sdk\\.auth\\.login\\(\\s*["']customer["']\\s*,\\s*["']${legacyPasswordProvider}["']`
      )
    )
  })

  it("signup uses signUp and not sdk.auth.register", () => {
    assert.match(source, /\.signUp\s*\(/)
    assert.doesNotMatch(source, /sdk\.auth\.register/)
  })

  it("signout calls supabase signOut and clears Medusa JWT helper", () => {
    assert.match(source, /signOut\s*\(/)
    assert.match(source, /removeAuthToken/)
  })

  it("bridges Supabase access_token to Medusa supabase provider + transferCart", () => {
    assert.match(
      source,
      /sdk\.auth\.login\(\s*["']customer["']\s*,\s*["']supabase["']/
    )
    assert.match(source, /access_token/)
    assert.match(source, /setAuthToken/)
    assert.match(source, /transferCart\s*\(/)
  })
})
