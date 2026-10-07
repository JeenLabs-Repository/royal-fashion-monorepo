import { createClient } from "@lib/supabase/server"
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

/**
 * PKCE / OTP exchange for signup confirmation and password recovery (AUTH-04).
 * Email links should target:
 *   http://127.0.0.1:8000/{countryCode}/auth/confirm?token_hash=...&type=...
 * or the code exchange form with ?code=...
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ countryCode: string }> }
) {
  const { countryCode } = await context.params
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextParam = searchParams.get("next")

  const accountPath = `/${countryCode}/account`
  const resetPath = `/${countryCode}/account/reset-password`
  const errorPath = `${accountPath}?auth_error=confirm`

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}${errorPath}`)
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (error) {
      return NextResponse.redirect(`${origin}${errorPath}`)
    }
  } else {
    return NextResponse.redirect(`${origin}${errorPath}`)
  }

  const isRecovery = type === "recovery"
  const fallback = isRecovery ? resetPath : accountPath
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : fallback

  return NextResponse.redirect(`${origin}${next}`)
}
