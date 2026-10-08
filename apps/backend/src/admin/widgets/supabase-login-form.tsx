import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { loginAdminWithSupabase } from "../routes/supabase-login/page.logic"

/**
 * Stock /app/login has no emailpass fields after hard cutover (user: ["supabase"] only).
 * Inject the Supabase email/password form into login.after so operators can sign in.
 */
const SupabaseLoginFormWidget = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await loginAdminWithSupabase(email, password)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      toast.error("Login failed", { description: result.error })
      return
    }

    toast.success("Signed in")
    navigate("/orders", { replace: true })
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-y-4 px-4 pb-8">
      <Heading level="h2">Sign in with email</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        Supabase Auth credentials. A matching Medusa admin User must already
        exist. Set VITE_MEDUSA_ADMIN_SUPABASE_URL and
        VITE_MEDUSA_ADMIN_SUPABASE_PUBLISHABLE_KEY in apps/backend/.env
      </Text>
      <form onSubmit={onSubmit} className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="supabase-admin-email">Email</Label>
          <Input
            id="supabase-admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="supabase-admin-password">Password</Label>
          <Input
            id="supabase-admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
          />
        </div>
        {error && (
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        )}
        <Button type="submit" isLoading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "login.after",
})

export default SupabaseLoginFormWidget
