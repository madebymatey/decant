import type { Cart } from "@decant/core"
import { WwCartResponseSchema } from "../schemas/cart.schema"

export const mapWwCartToCart = (raw: unknown, fallbackCurrency: string): Cart => {
  const parsed = WwCartResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      id: "",
      items: [],
      currency: fallbackCurrency,
    }
  }
  const c = parsed.data
  return {
    id: c.id,
    currency: c.currency ?? fallbackCurrency,
    items: c.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      variantId: i.variantId,
    })),
  }
}
