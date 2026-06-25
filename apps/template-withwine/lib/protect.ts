import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import {
  parseBearerToken,
  resolveCors,
  verifyToken,
  type HttpMethod,
} from "@decant/framer"

type ProtectOptions = {
  methods?: HttpMethod[]
  allowHeaders?: string[]
}

/**
 * Wrap a Next.js API route so only allow-listed origins holding a valid,
 * origin-bound Framer token can call it. Handles CORS + preflight using the
 * shared `@decant/framer` primitives (origin allowlist driven by env).
 */
export function protectApi(
  handler: NextApiHandler,
  opts: ProtectOptions = {}
): NextApiHandler {
  const methods = opts.methods ?? ["GET"]

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const origin = req.headers.origin
    const { allowed, headers } = resolveCors(origin, {
      methods: [...methods, "OPTIONS"],
      allowHeaders: opts.allowHeaders,
    })
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value)
    }

    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }
    if (!req.method || !methods.includes(req.method as HttpMethod)) {
      return res
        .status(405)
        .json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } })
    }
    if (!origin) {
      return res
        .status(400)
        .json({ error: { code: "MISSING_ORIGIN", message: "Missing Origin header" } })
    }
    if (!allowed) {
      return res
        .status(403)
        .json({ error: { code: "FORBIDDEN_ORIGIN", message: "Forbidden origin" } })
    }

    const token = parseBearerToken(req.headers.authorization)
    if (!token) {
      return res
        .status(401)
        .json({ error: { code: "MISSING_TOKEN", message: "Missing bearer token" } })
    }
    const result = verifyToken(token, origin)
    if (!result.ok) {
      return res
        .status(401)
        .json({ error: { code: "INVALID_TOKEN", message: result.reason } })
    }

    return handler(req, res)
  }
}
