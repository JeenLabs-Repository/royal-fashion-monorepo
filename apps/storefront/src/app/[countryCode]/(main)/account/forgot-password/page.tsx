"use client"

import { requestPasswordReset } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"
import { useActionState } from "react"

export default function ForgotPasswordPage() {
  const { countryCode } = useParams() as { countryCode: string }
  const [message, formAction] = useActionState(requestPasswordReset, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center mx-auto px-8 py-12"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Reset password</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Enter your email and we will send a Supabase reset link. Open the link
        to choose a new password.
      </p>
      {message?.state === "success" && (
        <div
          className="w-full mb-6 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="forgot-password-success"
        >
          {message.message}
        </div>
      )}
      <form className="w-full" action={formAction}>
        <input type="hidden" name="country_code" value={countryCode} />
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            data-testid="email-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="forgot-password-error"
        />
        <SubmitButton className="w-full mt-6" data-testid="forgot-password-submit">
          Send reset link
        </SubmitButton>
      </form>
      <LocalizedClientLink
        href="/account"
        className="text-small-regular underline mt-6"
      >
        Back to sign in
      </LocalizedClientLink>
    </div>
  )
}
