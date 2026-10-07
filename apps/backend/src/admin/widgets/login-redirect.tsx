import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * When stock /app/login is hit, send operators to Supabase login (CUT-02).
 * Zone attaches early on common dashboard shells; pathname guard does the work.
 */
const LoginRedirectWidget = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const path = location.pathname
    if (path === "/login" || path.endsWith("/login")) {
      navigate("/supabase-login", { replace: true })
    }
  }, [location.pathname, navigate])

  return null
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default LoginRedirectWidget
