import type { NextApiRequest, NextApiResponse } from "next"
import { mapC7Product } from "../../lib/mapC7Product"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional: if you plan to fetch this from Framer directly in the browser
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, tenant")
  if (req.method === "OPTIONS") return res.status(200).end()

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