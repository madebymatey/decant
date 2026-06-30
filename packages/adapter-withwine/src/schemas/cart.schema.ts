import { z } from "zod"

const idToString = z.union([z.string(), z.number()]).transform(String)

/**
 * A WithWine cart line, as returned by GET /api/cart and POST /api/cart/update.
 * Verified live against greenway staging (2026-06-29). The response is an array
 * of these — rich product objects, not just {productId, quantity}.
 */
export const WwCartLineSchema = z.object({
  id: idToString.optional(),
  productId: idToString,
  name: z.string().nullable().optional(),
  quantity: z.number(),
  singlePrice: z.number().nullable().optional(),
  fullPrice: z.number().nullable().optional(),
  halfDozenPrice: z.number().nullable().optional(),
  dozenPrice: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  totalWithOptions: z.number().nullable().optional(),
  stockCount: z.number().nullable().optional(),
  outOfStockBehaviour: z.string().nullable().optional(),
  minimumUnitPurchase: z.number().nullable().optional(),
  coverPhotoPath: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  options: z
    .array(
      z.object({
        productId: idToString.optional(),
        name: z.string().nullable().optional(),
        quantity: z.number().nullable().optional(),
        forItemQuantityIndex: z.number().nullable().optional(),
      })
    )
    .default([]),
})

/** The cart response is a bare array of lines. */
export const WwCartSchema = z.array(WwCartLineSchema)

/**
 * POST /api/order/price response. Totals object with embedded validation errors
 * (e.g. "Orders must be shippable in boxes of 6"). Verified live 2026-06-29.
 */
export const WwOrderPriceSchema = z.object({
  total: z.number().nullable().optional(),
  totalTaxAdded: z.number().nullable().optional(),
  totalTax: z.number().nullable().optional(),
  totalExShipping: z.number().nullable().optional(),
  totalExTax: z.number().nullable().optional(),
  shipping: z.number().nullable().optional(),
  isFreeShipping: z.boolean().nullable().optional(),
  errors: z.array(z.string()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
})
