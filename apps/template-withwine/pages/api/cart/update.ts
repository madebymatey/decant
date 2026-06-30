import type { NextApiRequest, NextApiResponse } from "next"
import type { Cart } from "@decant/core"
import { protectApi } from "../../../lib/protect"
import { adapter } from "../../../lib/adapter"
import { isDemoMode } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"
import { resolvedConfig } from "../../../storefront.config"

/**
 * POST /api/cart/update — upsert cart lines (quantity 0 removes).
 * Body: { sessionKey, items: [{ productId, quantity, options? }] }
 * Proxies WithWine `POST /api/cart/update`; returns the updated cart.
 */
export default protectApi(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { sessionKey, items } = (req.body ?? {}) as {
      sessionKey?: string
      items?: Cart["items"]
    }
    if (!sessionKey) {
      res.status(400).json({ error: { code: "MISSING_SESSION", message: "sessionKey is required" } })
      return
    }
    const lines = Array.isArray(items) ? items : []
    if (isDemoMode()) {
      res.status(200).json({
        id: sessionKey,
        currency: resolvedConfig.currency,
        items: lines.filter((l) => (l.quantity ?? 0) > 0),
      })
      return
    }
    try {
      res.status(200).json(await adapter.updateCart(sessionKey, lines))
    } catch (e) {
      sendPlatformError(res, e)
    }
  },
  { methods: ["POST"] }
)
