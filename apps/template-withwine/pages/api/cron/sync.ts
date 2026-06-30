import type { NextApiRequest, NextApiResponse } from "next"
import { parseBearerToken } from "@decant/framer"
import { syncToFramer } from "../../../lib/framer-sync/engine"
import { sendPlatformError } from "../../../lib/respond"

/**
 * GET /api/cron/sync -> scheduled Framer CMS sync (Vercel Cron trigger).
 *
 * The interval is configured in vercel.json (`crons`). Scheduling is gated by
 * SYNC_SCHEDULE_ENABLED so you can turn automatic syncing on/off without
 * redeploying logic — default OFF means the cron is a no-op and only manual
 * /api/sync/run runs.
 *
 * Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`
 * automatically, and we reject anything else.
 */
export const config = {
  maxDuration: 60,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const provided = parseBearerToken(req.headers.authorization)
    if (provided !== cronSecret) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } })
      return
    }
  }

  if (process.env.SYNC_SCHEDULE_ENABLED !== "true") {
    res.status(200).json({ ok: true, trigger: "cron", skipped: "scheduling disabled" })
    return
  }

  try {
    const result = await syncToFramer()
    res.status(200).json({ ok: true, trigger: "cron", result })
  } catch (e: unknown) {
    sendPlatformError(res, e)
  }
}
