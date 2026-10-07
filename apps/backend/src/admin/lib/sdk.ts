import Medusa from "@medusajs/js-sdk"

/**
 * Admin JS SDK with session cookie auth (not Store JWT).
 */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
