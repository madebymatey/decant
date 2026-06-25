import type { Product, ProductCollectionRef, WineAttributes } from "@decant/core"

/**
 * Framer-friendly product shape: a flat record with formatted price labels and
 * flattened wine attributes, ready to bind directly to layers/props in a Framer
 * code component without further transformation.
 */
export type FramerProduct = {
  id: string
  title: string
  description?: string
  slug?: string
  image?: string
  images: string[]
  price: number | null
  priceLabel: string | null
  compareAtPrice: number | null
  compareAtLabel: string | null
  currency: string
  sku?: string
  available: boolean
  collections: ProductCollectionRef[]
  category: string | null
  // Flattened wine attributes for direct binding in Framer.
  vintage: number | null
  varietal: string | null
  wineType: string | null
  region: string | null
  appellation: string | null
  countryCode: string | null
}

export type FramerProductField = keyof FramerProduct

/** Every selectable field, in a stable order. */
export const FRAMER_PRODUCT_FIELDS: FramerProductField[] = [
  "id",
  "title",
  "description",
  "slug",
  "image",
  "images",
  "price",
  "priceLabel",
  "compareAtPrice",
  "compareAtLabel",
  "currency",
  "sku",
  "available",
  "collections",
  "category",
  "vintage",
  "varietal",
  "wineType",
  "region",
  "appellation",
  "countryCode",
]

export type SerializeOptions = {
  /** BCP-47 locale used for currency formatting. Defaults to "en-US". */
  locale?: string
}

function formatMoney(
  amount: number | null | undefined,
  currency: string,
  locale: string
): string | null {
  if (typeof amount !== "number") {
    return null
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

/** Transform a core `Product` into the flat `FramerProduct` shape. */
export function toFramerProduct(
  p: Product,
  opts: SerializeOptions = {}
): FramerProduct {
  const locale = opts.locale ?? "en-US"
  const wine: WineAttributes = p.wine ?? {}
  const images = p.images ?? []
  const compareAtPrice = p.compareAtPrice ?? null
  const collections = p.collections ?? []

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    slug: p.slug,
    image: images[0],
    images,
    price: p.price,
    priceLabel: formatMoney(p.price, p.currency, locale),
    compareAtPrice,
    compareAtLabel: formatMoney(compareAtPrice, p.currency, locale),
    currency: p.currency,
    sku: p.sku,
    available: p.available ?? true,
    collections,
    // First collection name as a coarse category. TODO(withwine): use real
    // collections/ranges or the wineType enum once those are confirmed.
    category: collections[0]?.title ?? null,
    vintage: wine.vintage ?? null,
    varietal: wine.varietal ?? null,
    wineType: wine.type ?? null,
    region: wine.region ?? null,
    appellation: wine.appellation ?? null,
    countryCode: wine.countryCode ?? null,
  }
}

/** Transform a list of core `Product`s into `FramerProduct`s. */
export function toFramerProducts(
  products: Product[],
  opts: SerializeOptions = {}
): FramerProduct[] {
  return products.map((p) => toFramerProduct(p, opts))
}

/**
 * Parse a `?fields=` query value into a validated field list. Unknown fields are
 * dropped. Returns `null` when nothing valid is requested (caller should then
 * return the full object).
 */
export function parseFieldsParam(
  raw: string | string[] | undefined
): FramerProductField[] | null {
  if (raw == null) {
    return null
  }
  const value = Array.isArray(raw) ? raw.join(",") : raw
  const known = new Set<string>(FRAMER_PRODUCT_FIELDS)
  const requested = value
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is FramerProductField => known.has(s))
  return requested.length > 0 ? requested : null
}

/**
 * Return a copy of `product` containing only the requested fields. `id` is
 * always included so consumers can key/deduplicate.
 */
export function pickFields(
  product: FramerProduct,
  fields: FramerProductField[]
): Partial<FramerProduct> {
  const wanted = new Set<FramerProductField>(fields)
  wanted.add("id")
  const out: Partial<FramerProduct> = {}
  for (const key of FRAMER_PRODUCT_FIELDS) {
    if (wanted.has(key)) {
      ;(out as Record<string, unknown>)[key] = product[key]
    }
  }
  return out
}
