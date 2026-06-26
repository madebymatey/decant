import type { NextApiRequest, NextApiResponse } from "next"
import { parseBearerToken, slugify } from "@decant/framer"
import { getCatalogProducts } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"

/**
 * GET /api/feed/varietals -> flat JSON array of the UNIQUE varietal values
 * present in the catalog, for building a filter dropdown / a "Varietals" CMS
 * collection in Framer.
 *
 * Each record: { id, slug, name }. `id`/`slug` are stable (slug of the name),
 * `name` is the display label (e.g. "Shiraz", "Riesling"). Sorted A–Z.
 *
 * Same access model as /api/feed/products: public catalog data, optionally
 * gated by FEED_KEY (`?key=` or `Authorization: Bearer <key>`).
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

    // Dedupe by slug; keep the first display label seen for each.
    const bySlug = new Map<string, string>()
    for (const p of products) {
      const name = p.wine?.varietal?.trim()
      if (!name) continue
      const slug = slugify(name)
      if (slug && !bySlug.has(slug)) bySlug.set(slug, name)
    }

    const records = [...bySlug.entries()]
      .map(([slug, name]) => ({ id: slug, slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    res.status(200).json(records)
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
}
