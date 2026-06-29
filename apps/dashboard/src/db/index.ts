import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

/**
 * Drizzle client over Neon's HTTP driver (serverless-friendly).
 *
 * Initialised eagerly so the Auth.js Drizzle adapter can detect the Postgres
 * dialect from the instance at import time. `neon()` only parses the connection
 * string here — no network call happens until a query runs — so a placeholder
 * URL is safe during `next build` (DATABASE_URL is set in every real env).
 */
const url =
  process.env.DATABASE_URL ??
  "postgres://placeholder:placeholder@placeholder.neon.tech/placeholder"

export const db = drizzle(neon(url), { schema })

export { schema }
