import type { NextApiRequest, NextApiResponse } from "next"
import { protectApi } from "../../lib/protect"
import { resolvedConfig } from "../../storefront.config"

type CartLine = { id: string | number; quantity: number }

/**
 * POST /api/checkout
 *
 * Body: { items: [{ id, quantity }], country?, stateId?, postcode? }
 * Returns: { url } — WithWine's hosted checkout with the cart encoded as parallel
 * `productIds`/`quantities` query params. The browser then redirects there.
 *
 * Confirmed against the live WithWine checkout (2026-06-24): the order is fully
 * URL-driven — `productIds`/`quantities` (CSV, parallel arrays) define the cart;
 * country/stateId/postcode are optional shipping-estimate prefills (the checkout
 * page collects the full address). No server-side cart or cookie is required.
 * WithWine owns payment/tax/shipping/compliance, then returns the customer to
 * /CheckoutSuccess?oid=<orderId>.
 */
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const body = (req.body ?? {}) as {
    items?: CartLine[]
    country?: string
    stateId?: string | number
    postcode?: string
    sessionKey?: string
  }

  const lines = (Array.isArray(body.items) ? body.items : [])
    .map((i) => ({
      id: String(i?.id ?? "").trim(),
      quantity: Math.max(1, Math.floor(Number(i?.quantity) || 0)),
    }))
    .filter((i) => i.id && i.quantity > 0)

  if (lines.length === 0) {
    res.status(400).json({ error: { code: "EMPTY_CART", message: "Cart is empty" } })
    return
  }

  // WithWine hosts checkout at <apiBase>/WithWineOrder/Checkout (apiBase =
  // stage.withwine.com for staging, secure.withwine.com for production).
  const base = (resolvedConfig.apiUrl ?? "https://secure.withwine.com").replace(/\/$/, "")
  const params = new URLSearchParams()
  params.set("productIds", lines.map((i) => i.id).join(","))
  params.set("quantities", lines.map((i) => i.quantity).join(","))
  if (body.country) params.set("country", String(body.country))
  if (body.stateId != null && body.stateId !== "") params.set("stateId", String(body.stateId))
  if (body.postcode) params.set("postcode", String(body.postcode))
  // Links the hosted checkout back to the server-synced cart (abandoned-cart
  // tracking / completion). Verified the checkout shell accepts it (2026-06-29).
  if (body.sessionKey) params.set("sessionKey", String(body.sessionKey))

  res.status(200).json({ url: `${base}/WithWineOrder/Checkout/?${params.toString()}` })
}

export default protectApi(handler, { methods: ["POST"] })
