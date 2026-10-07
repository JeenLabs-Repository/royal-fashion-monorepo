"use client"

import { updatePassword } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState } from "react"

export default function ResetPasswordPage() {
  const [message, formAction] = useActionState(updatePassword, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center mx-auto px-8 py-12"
      data-testid="reset-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Choose a new password</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Use the password form after opening the reset link from your email. A
        valid recovery session is required.
      </p>
      {message?.state === "success" && (
        <div
          className="w-full mb-6 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="reset-password-success"
        >
          {message.message}
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="password-input"
          />
          <Input
            label="Confirm password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="confirm-password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="reset-password-error"
        />
        <SubmitButton className="w-full mt-6" data-testid="reset-password-submit">
          Update password
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
