import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { loginAdminWithSupabase } from "./page.logic"

/**
 * Operator entry: Supabase email/password then Medusa user session.
 * Primary Admin entry after hard cutover: /app/supabase-login
 */
const SupabaseLoginPage = () => {
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
    navigate("/orders")
  }

  return (
    <Container className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-md flex flex-col gap-y-4">
        <Heading level="h1">Admin sign in (Supabase)</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Use your Supabase operator credentials. A matching Medusa User row must
          already exist (see docs/admin-supabase-bootstrap.md).
        </Text>
        <form onSubmit={onSubmit} className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Supabase Login",
})

export default SupabaseLoginPage
