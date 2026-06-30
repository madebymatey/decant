import type { Product, WineAttributes } from "@decant/core"
import { C7ProductSchema } from "../schemas/product.schema"

const toDollars = (cents: number | null | undefined): number | null =>
  typeof cents === "number" ? cents / 100 : null

const toVintage = (v: number | string | null | undefined): number | null => {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

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
  const price = toDollars(v?.price)
  const compare = toDollars(v?.comparePrice)
  const compareAtPrice = compare != null && price != null && compare > price ? compare : null
  const img = p.image ?? p.images?.[0]?.src

  // Commerce7 ships a standardized `wine` block whose fields line up 1:1 with our
  // WineAttributes — pass them through (types already come as clean labels, e.g.
  // "Red"). Only attach `wine` when at least one attribute is present.
  const w = p.wine
  const wine: WineAttributes = {
    type: w?.type ?? null,
    varietal: w?.varietal ?? null,
    vintage: toVintage(w?.vintage),
    region: w?.region ?? null,
    appellation: w?.appellation ?? null,
    countryCode: w?.countryCode ?? null,
  }
  const hasWine = Object.values(wine).some((x) => x != null)

  return {
    id: p.id,
    title: p.title,
    description: p.content ?? p.teaser ?? undefined,
    price,
    compareAtPrice,
    currency,
    images: img ? [img] : undefined,
    sku: p.slug,
    slug: p.slug,
    available: p.webStatus != null ? p.webStatus === "Available" : undefined,
    wine: hasWine ? wine : undefined,
  }
}
