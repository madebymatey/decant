import type { Product } from "@decant/core"
import { OpProductSchema } from "../schemas/product.schema"

export const mapOpProductToProduct = (raw: unknown, fallbackCurrency: string): Product => {
  const parsed = OpProductSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      id: "",
      title: "",
      price: null,
      currency: fallbackCurrency,
    }
  }
  const p = parsed.data
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price ?? null,
    currency: p.currency ?? fallbackCurrency,
    images: p.images,
    sku: p.sku,
  }
}
