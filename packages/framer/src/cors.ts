import { isAllowedOrigin, type OriginAllowlistOptions } from "./origin"

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"

export type CorsOptions = OriginAllowlistOptions & {
  /** Methods to advertise. Defaults to ["GET", "OPTIONS"]. */
  methods?: HttpMethod[]
  /** Request headers to allow. Defaults to ["Content-Type", "Authorization"]. */
  allowHeaders?: string[]
}

export type CorsResult = {
  /** Whether the origin is allowed. `false` means caller should 403 (or 400 if no origin). */
  allowed: boolean
  /** Response headers to set regardless of outcome (always includes `Vary: Origin`). */
  headers: Record<string, string>
}

/**
 * Framework-agnostic CORS resolution. Returns the headers to set and whether
 * the request origin is allowed. The host (Next.js route, Vercel function)
 * applies the headers and decides the status code.
 */
export function resolveCors(
  origin: string | undefined,
  opts: CorsOptions = {}
): CorsResult {
  const methods = opts.methods ?? ["GET", "OPTIONS"]
  const allowHeaders = opts.allowHeaders ?? ["Content-Type", "Authorization"]

  // Always vary by Origin so CDNs don't serve one origin's CORS to another.
  const headers: Record<string, string> = { Vary: "Origin" }

  if (!origin || !isAllowedOrigin(origin, opts)) {
    return { allowed: false, headers }
  }

  headers["Access-Control-Allow-Origin"] = origin
  headers["Access-Control-Allow-Methods"] = methods.join(",")
  headers["Access-Control-Allow-Headers"] = allowHeaders.join(", ")
  return { allowed: true, headers }
}

/** Extract a bearer token from an Authorization header value. */
export function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null
  }
  const m = /^Bearer\s+(.+)$/i.exec(authorization)
  return m?.[1] ?? null
}
