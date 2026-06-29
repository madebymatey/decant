/**
 * Typed access to the decant feed endpoints.
 *
 * These mirror the shapes produced by @decant/framer:
 *  - /api/feed/products    -> CmsProductRecord[]   (toCmsRecords)
 *  - /api/feed/wine-types  -> WineTypeRecord[]
 *
 * Both endpoints send `Access-Control-Allow-Origin: *`, so the plugin (running
 * in a Framer iframe) can fetch them directly. An optional FEED_KEY is passed
 * as a Bearer token when provided.
 */

/** One option in the Wine Types collection. `slug` doubles as the stable id. */
export type WineTypeRecord = {
  id: string
  slug: string
  name: string
  count: number
}

/** One option in the Varietals collection. `slug` doubles as the stable id. */
export type VarietalRecord = {
  id: string
  slug: string
  name: string
}

/** Flat product record from /api/feed/products (matches @decant/framer's CmsProductRecord). */
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
  /** Wine type display value (e.g. "Red"); the plugin slugifies it for id matching. */
  wineType: string
  available: boolean
  vintage: number | null
  /** Varietal display value; the plugin slugifies it for id matching. */
  varietal: string
  region: string
  appellation: string
  countryCode: string
  sku: string
}

async function getJson<T>(url: string, key?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (key) headers.Authorization = `Bearer ${key}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

const trimBase = (base: string) => base.replace(/\/+$/, "")

export function fetchWineTypes(baseUrl: string, key?: string): Promise<WineTypeRecord[]> {
  // ?all=true so every taxonomy option exists as a reference target, even types
  // with zero products today.
  return getJson<WineTypeRecord[]>(`${trimBase(baseUrl)}/api/feed/wine-types?all=true`, key)
}

export function fetchVarietals(baseUrl: string, key?: string): Promise<VarietalRecord[]> {
  return getJson<VarietalRecord[]>(`${trimBase(baseUrl)}/api/feed/varietals`, key)
}

export function fetchProducts(baseUrl: string, key?: string): Promise<CmsProductRecord[]> {
  return getJson<CmsProductRecord[]>(`${trimBase(baseUrl)}/api/feed/products`, key)
}
