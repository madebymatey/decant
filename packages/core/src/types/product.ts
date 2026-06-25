/**
 * Wine-specific attributes. Optional so non-wine catalogs and platforms that
 * don't expose these fields stay valid. Surfaced in Framer for filtering and
 * product detail (vintage, varietal, region, etc.).
 */
export type WineAttributes = {
  vintage?: number | null
  varietal?: string | null
  type?: string | null
  region?: string | null
  appellation?: string | null
  countryCode?: string | null
}

export type ProductCollectionRef = {
  id: string
  title: string
  slug?: string
}

export type Product = {
  id: string
  title: string
  description?: string
  price: number | null
  compareAtPrice?: number | null
  currency: string
  images?: string[]
  sku?: string
  slug?: string
  available?: boolean
  collections?: ProductCollectionRef[]
  wine?: WineAttributes
}
