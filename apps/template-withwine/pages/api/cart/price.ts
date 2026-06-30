import type { NextApiRequest, NextApiResponse } from "next"
import type { Cart } from "@decant/core"
import { protectApi } from "../../../lib/protect"
import { adapter } from "../../../lib/adapter"
import { isDemoMode } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"
import { resolvedConfig } from "../../../withwine.config"

/**
 * POST /api/cart/price — live totals/tax/shipping for a set of lines.
 * Body: { sessionKey, items: [{ productId, quantity, options? }] }
 * Proxies WithWine `POST /api/order/price` (needs explicit items). Returns
 * CartTotals, including `errors` like the box-of-6 pack rule.
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
      const subTotal = lines.reduce((s, l) => s + (l.unitPrice ?? 0) * (l.quantity ?? 0), 0)
      res.status(200).json({
        currency: resolvedConfig.currency,
        subTotal,
        total: subTotal,
        tax: 0,
        shipping: 0,
        isFreeShipping: false,
        errors: [],
      })
      return
    }
    try {
      res.status(200).json(await adapter.priceCart(sessionKey, lines))
    } catch (e) {
      sendPlatformError(res, e)
    }
  },
  { methods: ["POST"] }
)
