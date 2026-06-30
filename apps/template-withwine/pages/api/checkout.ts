import type { NextApiRequest, NextApiResponse } from "next"
import type { CheckoutInput } from "@decant/core"
import { protectApi } from "../../lib/protect"
import { adapter } from "../../lib/adapter"
import { resolvedConfig } from "../../storefront.config"
import { sendPlatformError } from "../../lib/respond"

type CartLine = { id?: string | number; sku?: string; quantity?: number }

/**
 * POST /api/checkout
 *
 * Body: { items: [{ id, sku?, quantity }], country?, stateId?, postcode?, sessionKey? }
 * Returns: { url } — the platform's hosted checkout, which the browser redirects
 * to. The handoff itself is platform-specific and lives in the adapter
 * (`createCheckout`): WithWine encodes the cart as productIds/quantities query
 * params; Commerce7 uses addToCart/quantity + checkout=true on its storefront.
 */
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const body = (req.body ?? {}) as {
    items?: CartLine[]
    country?: string
    stateId?: string | number
    postcode?: string
    sessionKey?: string
  }

  const items: CheckoutInput["items"] = (Array.isArray(body.items) ? body.items : [])
    .map((i) => ({
      id: String(i?.id ?? "").trim(),
      sku: i?.sku ? String(i.sku).trim() : undefined,
      quantity: Math.max(1, Math.floor(Number(i?.quantity) || 0)),
    }))
    .filter((i) => (i.id || i.sku) && i.quantity > 0)

  if (items.length === 0) {
    res.status(400).json({ error: { code: "EMPTY_CART", message: "Cart is empty" } })
    return
  }

  if (!adapter.createCheckout) {
    res.status(501).json({
      error: {
        code: "NOT_IMPLEMENTED",
        message: `Checkout is not supported for platform "${resolvedConfig.platform}".`,
      },
    })
    return
  }

  try {
    const result = await adapter.createCheckout({
      items,
      country: body.country,
      stateId: body.stateId,
      postcode: body.postcode,
      sessionKey: body.sessionKey,
    })
    res.status(200).json(result)
  } catch (e) {
    sendPlatformError(res, e)
  }
}

export default protectApi(handler, { methods: ["POST"] })
