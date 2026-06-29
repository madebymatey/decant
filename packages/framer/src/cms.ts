import type { FramerProduct } from "./serializer"

/**
 * Flat, CMS-sync-friendly product record. Every key is always present (empty
 * string / null rather than undefined) and values are primitives or string
 * arrays, so external sync tools (e.g. FramerSync's API source) can detect every
 * field and map it onto a Framer CMS collection field.
 */
export type CmsProductRecord = {
  id: string
  slug: string
  name: string
  description: string
  price: number | null
  priceLabel: string
  compareAtPrice: number | null
  compareAtLabel: string
  currency: string
  image: string
  images: string[]
  category: string
  // Display value (e.g. "Red"), for mapping onto a Framer single-reference
  // field. FramerSync resolves the reference by matching this against the Wine
  // Types item's NAME, so we send the human-readable value, not the slug.
  wineType: string
  available: boolean
  vintage: number | null
  // Display value (e.g. "Cabernet Sauvignon"); matches the Varietals item name.
  varietal: string
  region: string
  appellation: string
  countryCode: string
  sku: string
}

/** URL-safe slug from arbitrary text (diacritics stripped). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Flatten one FramerProduct into a CMS record. */
export function toCmsRecord(p: FramerProduct): CmsProductRecord {
  const slugBase = slugify(p.title ?? "")
  return {
    id: p.id,
    slug: slugBase || p.id,
    name: p.title ?? "",
    description: p.description ?? "",
    price: p.price,
    priceLabel: p.priceLabel ?? "",
    compareAtPrice: p.compareAtPrice,
    compareAtLabel: p.compareAtLabel ?? "",
    currency: p.currency,
    image: p.image ?? p.images[0] ?? "",
    images: p.images,
    category: p.category ?? "",
    wineType: p.wineType ?? "",
    available: p.available,
    vintage: p.vintage,
    varietal: p.varietal ?? "",
    region: p.region ?? "",
    appellation: p.appellation ?? "",
    countryCode: p.countryCode ?? "",
    sku: p.sku ?? "",
  }
}

/** Flatten a list, guaranteeing unique slugs (appends `-id` on collision). */
export function toCmsRecords(products: FramerProduct[]): CmsProductRecord[] {
  const counts = new Map<string, number>()
  return products.map((p) => {
    const rec = toCmsRecord(p)
    const seen = counts.get(rec.slug) ?? 0
    counts.set(rec.slug, seen + 1)
    return seen === 0 ? rec : { ...rec, slug: `${rec.slug}-${rec.id}` }
  })
}
