import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      // Customer Store auth via Supabase bridge; keep emailpass for Admin user until Phase 4/5
      authMethodsPerActor: {
        customer: ["supabase"],
        user: ["emailpass"],
      },
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "./src/modules/supabase-auth",
            id: "supabase",
            options: {
              supabaseUrl: process.env.SUPABASE_URL,
              apiKey:
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.SUPABASE_SECRET_KEY ||
                process.env.SUPABASE_PUBLISHABLE_KEY ||
                process.env.SUPABASE_ANON_KEY,
            },
          },
        ],
      },
    },
  ],
})
