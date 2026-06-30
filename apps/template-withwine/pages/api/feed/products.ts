import type { NextApiRequest, NextApiResponse } from "next"
import { parseBearerToken, toCmsRecords, toFramerProducts } from "@decant/framer"
import { getCatalogProducts } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"
import { resolvedConfig } from "../../../storefront.config"

/**
 * GET /api/feed/products -> flat JSON array of products for an external CMS sync
 * tool (e.g. FramerSync's "API" source) to map onto a Framer CMS collection.
 *
 * Not origin/Framer-token gated — sync tools fetch server-side. Optionally
 * protected by a shared secret: set FEED_KEY and pass `?key=` or
 * `Authorization: Bearer <key>`. Payload is public catalog data.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
  res.setHeader("Vary", "Origin")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } })
    return
  }

  const requiredKey = process.env.FEED_KEY
  if (requiredKey) {
    const provided =
      (typeof req.query.key === "string" ? req.query.key : undefined) ??
      parseBearerToken(req.headers.authorization) ??
      undefined
    if (provided !== requiredKey) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid feed key" } })
      return
    }
  }

  try {
    const products = await getCatalogProducts()
    const framer = toFramerProducts(products, { locale: resolvedConfig.locale })
    // Root-level JSON array — broadly compatible with API-source importers.
    res.status(200).json(toCmsRecords(framer))
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
}
