import type { NextApiRequest, NextApiResponse } from "next"
import { issueToken, resolveCors } from "@decant/framer"

type TokenResponse = { token: string; expiresIn: number }

/**
 * Issues a short-lived, origin-bound token. The Framer code component POSTs here
 * first, then sends the returned token as `Authorization: Bearer <token>` to the
 * protected data routes (e.g. /api/products).
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | { error: unknown }>
) {
  const origin = req.headers.origin
  const { allowed, headers } = resolveCors(origin, {
    methods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  if (req.method !== "POST") {
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

  try {
    const token = issueToken(origin)
    const expiresIn = Number(process.env.TOKEN_TTL_SECONDS ?? "300")
    return res.status(200).json({ token, expiresIn })
  } catch {
    return res
      .status(500)
      .json({ error: { code: "TOKEN_ERROR", message: "Failed to issue token" } })
  }
}
