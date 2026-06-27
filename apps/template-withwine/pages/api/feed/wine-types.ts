import type { NextApiRequest, NextApiResponse } from "next"
import { parseBearerToken, slugify } from "@decant/framer"
import { WINE_TYPE_OPTIONS } from "@decant/adapter-withwine"
import { getCatalogProducts } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"

/**
 * GET /api/feed/wine-types -> flat JSON array of wineType values for a "Wine
 * Types" CMS collection / filter in Framer.
 *
 * Each record: { id, slug, name, count }. `count` = how many catalog products
 * have that type (so you can hide or grey out empty options).
 *
 * Modes:
 *   - default: only the types present in the catalog (count >= 1).
 *   - ?all=true: the full WithWine taxonomy, including types with count 0.
 *
 * Sorted A–Z. Same access model as /api/feed/products: public catalog data,
 * optionally gated by FEED_KEY (`?key=` or `Authorization: Bearer <key>`).
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

  const all = req.query.all === "true" || req.query.all === "1"

  try {
    const products = await getCatalogProducts()

    // Count products per type slug; remember a display label for each.
    const count = new Map<string, number>()
    const labelBySlug = new Map<string, string>()
    for (const p of products) {
      const name = p.wine?.type?.trim()
      if (!name) continue
      const slug = slugify(name)
      if (!slug) continue
      count.set(slug, (count.get(slug) ?? 0) + 1)
      if (!labelBySlug.has(slug)) labelBySlug.set(slug, name)
    }

    // Base set of names: full taxonomy (all=true) or only those present.
    const names = all ? WINE_TYPE_OPTIONS : [...labelBySlug.values()]
    const seen = new Set<string>()
    const records = names
      .map((name) => {
        const slug = slugify(name)
        return { id: slug, slug, name: labelBySlug.get(slug) ?? name, count: count.get(slug) ?? 0 }
      })
      .filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)))
      .sort((a, b) => a.name.localeCompare(b.name))

    res.status(200).json(records)
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
}
