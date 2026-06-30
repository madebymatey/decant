import type { NextApiRequest, NextApiResponse } from "next"
import { protectApi } from "../../../lib/protect"
import { adapter } from "../../../lib/adapter"
import { isDemoMode } from "../../../lib/catalog"
import { sendPlatformError } from "../../../lib/respond"

/**
 * POST /api/cart/complete — mark the session's cart completed after an order.
 * Body: { sessionKey, orderId }
 * Proxies WithWine `POST /api/cart/complete` (clears the cart). Call this on the
 * CheckoutSuccess return so the server cart isn't counted as abandoned.
 */
export default protectApi(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { sessionKey, orderId } = (req.body ?? {}) as {
      sessionKey?: string
      orderId?: string | number
    }
    if (!sessionKey || orderId == null || orderId === "") {
      res
        .status(400)
        .json({ error: { code: "BAD_REQUEST", message: "sessionKey and orderId are required" } })
      return
    }
    if (isDemoMode()) {
      res.status(200).json({ ok: true })
      return
    }
    try {
      await adapter.completeCart(sessionKey, String(orderId))
      res.status(200).json({ ok: true })
    } catch (e) {
      sendPlatformError(res, e)
    }
  },
  { methods: ["POST"] }
)
