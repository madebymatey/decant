import type { Order } from "@decant/core"
import { WwOrderResponseSchema } from "../schemas/order.schema"

export const mapWwOrderToOrder = (raw: unknown, fallbackCurrency: string): Order => {
  const parsed = WwOrderResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      id: "",
      cartId: "",
      status: "unknown",
      createdAt: new Date(0).toISOString(),
      total: 0,
      currency: fallbackCurrency,
    }
  }
  const o = parsed.data
  return {
    id: o.id,
    cartId: o.cartId,
    status: o.status,
    createdAt: o.createdAt,
    total: o.total,
    currency: o.currency ?? fallbackCurrency,
  }
}
