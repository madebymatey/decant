import type { NextApiRequest, NextApiResponse } from "next"
import { protectApi } from "../../../lib/protect"
import { adapter } from "../../../lib/adapter"
import { isDemoMode } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"
import { resolvedConfig } from "../../../withwine.config"

/**
 * GET /api/cart?sessionKey=<id> — the anonymous server-synced cart.
 *
 * Proxies WithWine's `GET /api/cart?BrandId&UnauthenticatedSessionId`, injecting
 * the clientId server-side. Origin + token gated (protectApi). The session key is
 * the client-generated id the Framer cart holds.
 */
export default protectApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const sessionKey = typeof req.query.sessionKey === "string" ? req.query.sessionKey : ""
  if (!sessionKey) {
    res.status(400).json({ error: { code: "MISSING_SESSION", message: "sessionKey is required" } })
    return
  }
  if (isDemoMode()) {
    res.status(200).json({ id: sessionKey, items: [], currency: resolvedConfig.currency })
    return
  }
  try {
    res.status(200).json(await adapter.getCart(sessionKey))
  } catch (e) {
    sendPlatformError(res, e)
  }
})
