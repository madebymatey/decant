import type { Product } from "@decant/core"
import { C7ProductSchema } from "../schemas/product.schema"

export const mapC7ProductToProduct = (raw: unknown, currency: string): Product => {
  const parsed = C7ProductSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      id: "",
      title: "",
      price: null,
      currency,
    }
  }
  const p = parsed.data
  const v = p.variants?.[0]
  const priceCents = v?.price ?? null
  const price = typeof priceCents === "number" ? priceCents / 100 : null
  const img = p.image ?? p.images?.[0]?.src
  return {
    id: p.id,
    title: p.title,
    price,
    currency,
    images: img ? [img] : undefined,
    sku: p.slug,
  }
}
