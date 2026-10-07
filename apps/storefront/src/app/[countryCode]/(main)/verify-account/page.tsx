import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Email verification is handled via Supabase confirmation links.",
}

/**
 * Medusa verify-account UX retired (D-08). Shoppers verify via Supabase email
 * links that land on /{countryCode}/auth/confirm.
 */
export default function VerifyAccountPage() {
  return (
    <div
      className="w-full flex justify-center px-8 py-12"
      data-testid="verify-account-page"
    >
      <div className="max-w-sm flex flex-col items-center text-center">
        <h1 className="text-large-semi uppercase mb-6">Check your email</h1>
        <p className="text-base-regular text-ui-fg-base mb-6">
          Account verification no longer uses this page. Open the confirmation
          link from your email (Mailpit at{" "}
          <code className="text-small-regular">http://127.0.0.1:54324</code> in
          local development) to finish signup.
        </p>
        <LocalizedClientLink href="/account" className="underline">
          Back to account
        </LocalizedClientLink>
      </div>
    </div>
  )
}
