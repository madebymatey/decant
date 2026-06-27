import type { Product } from "@decant/core"
import { WwProductSchema } from "../schemas/product.schema"

export type MapProductOptions = {
  /** Fallback currency when the product/brand doesn't specify one. */
  currency: string
  /** Asset/CDN base used to absolutize relative image paths (coverPhotoPath). */
  assetBaseUrl?: string
}

const prefixAsset = (path: string, base?: string): string => {
  if (/^https?:\/\//i.test(path)) return path
  if (!base) return path
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

const parseVintage = (v: string | number | null | undefined): number | null => {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * WithWine `wineType` enum → display label, matching WithWine's own product-type
 * list. Edit a value here to control exactly what shows in the CMS (e.g. drop
 * "Wine" → "Red"). Unknown values fall back to splitting the camelCase enum, so
 * new WithWine types still render reasonably without a code change.
 */
const WINE_TYPE_LABELS: Record<string, string> = {
  RedWine: "Red",
  WhiteWine: "White",
  SparklingWine: "Sparkling",
  FortifiedWine: "Fortified",
  Champagne: "Champagne",
  DessertWine: "Dessert",
  Rose: "Rosé",
  Rosé: "Rosé",
  NonAlcoholicWine: "Non-Alcoholic",
  OrangeWine: "Orange",
  Piquette: "Piquette",
  SweetWine: "Sweet",
  Cider: "Cider",
  Beer: "Beer",
  Whisky: "Whisky",
  Bourbon: "Bourbon",
  Rum: "Rum",
  Vodka: "Vodka",
  Gin: "Gin",
  Tequila: "Tequila",
  Liqueurs: "Liqueurs",
  Brandy: "Brandy",
  Cognac: "Cognac",
  PreMixedDrinks: "Pre-mixed Drinks",
  OtherSpirits: "Other Spirits",
  Aperitif: "Apéritif",
  Apéritif: "Apéritif",
}

const humanizeWineType = (raw: string): string =>
  WINE_TYPE_LABELS[raw] ?? raw.replace(/([a-z])([A-Z])/g, "$1 $2").trim()

/**
 * Every possible wine-type display label, deduped, in WithWine's list order.
 * Use this to build a complete "all possible types" filter collection (including
 * types no current product has).
 */
export const WINE_TYPE_OPTIONS: string[] = [
  "Red",
  "White",
  "Sparkling",
  "Fortified",
  "Champagne",
  "Dessert",
  "Rosé",
  "Non-Alcoholic",
  "Orange",
  "Piquette",
  "Sweet",
  "Cider",
  "Beer",
  "Whisky",
  "Bourbon",
  "Rum",
  "Vodka",
  "Gin",
  "Tequila",
  "Liqueurs",
  "Brandy",
  "Cognac",
  "Pre-mixed Drinks",
  "Other Spirits",
  "Apéritif",
]

export const mapWwProductToProduct = (
  raw: unknown,
  opts: MapProductOptions
): Product => {
  const { currency, assetBaseUrl } = opts
  const parsed = WwProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { id: "", title: "", price: null, currency }
  }
  const p = parsed.data

  const price = p.singlePrice ?? p.bottlePrice ?? p.fullPrice ?? null
  const compareAtPrice =
    p.fullPrice != null && price != null && p.fullPrice > price
      ? p.fullPrice
      : null
  const image = p.coverPhotoPath
    ? prefixAsset(p.coverPhotoPath, assetBaseUrl)
    : undefined
  const region = p.region ?? p.state ?? null
  const vintage = parseVintage(p.vintage)
  // `wineType` is a string name ("RedWine", "WhiteWine", …) on wines and an int
  // (e.g. 0) on non-wines like gift cards. Only the string form is a meaningful
  // category, so pass strings through and ignore the int enum (mapping unconfirmed).
  const wineType =
    typeof p.wineType === "string" && p.wineType ? humanizeWineType(p.wineType) : null
  const varietal = p.varietyType || p.varietyComposition || null

  return {
    id: p.id,
    title: p.displayName || p.name,
    description: p.description ?? undefined,
    price,
    compareAtPrice,
    currency: p.brand?.paymentCurrency ?? currency,
    images: image ? [image] : undefined,
    available: p.isSaleable,
    wine:
      vintage !== null || region !== null || wineType !== null || varietal !== null
        ? { vintage, region, type: wineType, varietal }
        : undefined,
  }
}
