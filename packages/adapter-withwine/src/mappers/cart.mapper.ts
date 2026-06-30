import type { Cart, CartTotals } from "@decant/core"
import { WwCartSchema, WwOrderPriceSchema } from "../schemas/cart.schema"

function imageUrl(path: string | null | undefined, assetBaseUrl?: string): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  if (!assetBaseUrl) return path
  return `${assetBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

/**
 * Map a WithWine cart response (array of line objects) → core Cart. The cart is
 * identified by the session id (the client-generated UnauthenticatedSessionId),
 * which we carry through as Cart.id.
 */
export const mapWwCartToCart = (
  raw: unknown,
  sessionKey: string,
  currency: string,
  assetBaseUrl?: string
): Cart => {
  const parsed = WwCartSchema.safeParse(raw)
  const lines = parsed.success ? parsed.data : []
  return {
    id: sessionKey,
    currency,
    items: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      name: l.name ?? undefined,
      image: imageUrl(l.coverPhotoPath ?? l.thumbnailUrl, assetBaseUrl),
      unitPrice: l.singlePrice ?? l.fullPrice ?? undefined,
      lineTotal: l.totalWithOptions ?? l.total ?? undefined,
      available:
        l.stockCount == null
          ? undefined
          : l.stockCount > 0 || l.outOfStockBehaviour === "BackOrder",
      minimumUnitPurchase: l.minimumUnitPurchase ?? undefined,
      options: (l.options ?? []).map((o) => ({
        productId: o.productId ?? "",
        name: o.name ?? "",
        quantity: o.quantity ?? 1,
        forItemQuantityIndex: o.forItemQuantityIndex ?? null,
      })),
    })),
  }
}

/** Map a WithWine /api/order/price response → core CartTotals. */
export const mapWwPriceToTotals = (raw: unknown, currency: string): CartTotals => {
  const parsed = WwOrderPriceSchema.safeParse(raw)
  const p = parsed.success ? parsed.data : {}
  const total = p.total ?? 0
  const tax = p.totalTaxAdded ?? p.totalTax ?? 0
  const shipping = p.shipping ?? 0
  const errors = [...(p.errors ?? []), ...(p.errorMessage ? [p.errorMessage] : [])]
  return {
    currency,
    subTotal: p.totalExShipping ?? Math.max(0, total - shipping),
    total,
    tax,
    shipping,
    isFreeShipping: Boolean(p.isFreeShipping),
    errors,
  }
}
