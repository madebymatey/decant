import type { NextApiRequest, NextApiResponse } from "next"
import { mapC7Product } from "../../lib/mapC7Product"
import { isAllowedOrigin, verifyToken } from "../../lib/token"

function getBearerToken(req: NextApiRequest): string | null {
  const h = req.headers.authorization
  if (!h) return null
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1] ?? null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin

  // CORS: allow only specific origins (Framer domains / your custom domain)
  res.setHeader("Vary", "Origin")

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  } else if (origin) {
    // If the request has an Origin header and it isn't allowlisted, block it.
    return res.status(403).json({ error: "Forbidden origin", origin })
  }

  // Preflight
  if (req.method === "OPTIONS") return res.status(200).end()

  // Require origin for browser-based access
  if (!origin) {
    return res.status(400).json({ error: "Missing Origin header" })
  }

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Forbidden origin", origin })
  }

  // Require Bearer token
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" })
  }

  const v = verifyToken(token, origin)
  if (!v.ok) {
    return res.status(401).json({ error: "Invalid token", reason: v.reason })
  }

  try {
    const baseUrl = process.env.C7_BASE_URL
    const appId = process.env.C7_APP_ID
    const appSecret = process.env.C7_APP_SECRET
    const tenant = process.env.C7_TENANT

    if (!baseUrl || !appId || !appSecret || !tenant) {
      return res.status(500).json({
        error: "Missing env vars",
        missing: {
          C7_BASE_URL: !baseUrl,
          C7_APP_ID: !appId,
          C7_APP_SECRET: !appSecret,
          C7_TENANT: !tenant,
        },
      })
    }

    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "start"
    const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64")

    const r = await fetch(`${baseUrl}/product?cursor=${encodeURIComponent(cursor)}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        tenant,
        Accept: "application/json",
      },
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: "Commerce7 request failed", details: text })
    }

    const data = await r.json()
    const products = Array.isArray(data?.products) ? data.products : []
    const items = products.map(mapC7Product)

    return res.status(200).json({ items, cursor: data?.cursor ?? null })
  } catch (e: any) {
    return res.status(500).json({ error: "Unexpected error", details: String(e?.message ?? e) })
  }
}