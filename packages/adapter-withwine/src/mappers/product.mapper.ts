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

  return {
    id: p.id,
    title: p.displayName || p.name,
    description: p.description ?? undefined,
    price,
    compareAtPrice,
    currency: p.brand?.paymentCurrency ?? currency,
    images: image ? [image] : undefined,
    available: p.isSaleable,
    // Only attach wine attrs we can map confidently. `wineType` is an int enum
    // whose name mapping is unconfirmed, so it's left off for now.
    wine:
      vintage !== null || region !== null
        ? { vintage, region }
        : undefined,
  }
}
