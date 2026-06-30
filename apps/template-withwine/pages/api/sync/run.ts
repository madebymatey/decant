import type { NextApiRequest, NextApiResponse } from "next"
import { parseBearerToken } from "@decant/framer"
import { syncToFramer } from "../../../lib/framer-sync/engine"

/**
 * POST /api/sync/run -> run the Framer CMS sync on demand (manual trigger).
 *
 * Use this during development/testing. Protected by SYNC_KEY: pass it as
 * `?key=` or `Authorization: Bearer <key>`. If SYNC_KEY is unset, the endpoint
 * is open (fine for local dev only).
 *
 * Runs the same engine as the scheduled cron, so manual and automatic syncs are
 * identical.
 */
export const config = {
  // Headless sync over a WebSocket can take a while. Capped at 60s for the Vercel
  // Hobby plan (a ~50-product sync runs in well under that).
  maxDuration: 60,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } })
    return
  }

  const requiredKey = process.env.SYNC_KEY
  if (requiredKey) {
    const provided =
      parseBearerToken(req.headers.authorization) ??
      (typeof req.query.key === "string" ? req.query.key : undefined)
    if (provided !== requiredKey) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid sync key" } })
      return
    }
  }

  try {
    // Optional collection mappings + field overrides from the Decant dashboard.
    const mappings =
      req.body && Array.isArray(req.body.mappings) ? req.body.mappings : undefined
    const result = await syncToFramer({ mappings })
    res.status(200).json({ ok: true, trigger: "manual", result })
  } catch (e: unknown) {
    // Protected endpoint — return the real message so the admin can act on it.
    console.error("[sync/run] failed:", e)
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
