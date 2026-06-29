import { defineConfig } from "drizzle-kit"

/**
 * Drizzle Kit config. Reads DATABASE_URL from the environment.
 * - `pnpm db:generate` writes SQL migrations to ./drizzle from schema changes.
 * - `pnpm db:push` applies the schema directly (handy for dev / first setup).
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
})
