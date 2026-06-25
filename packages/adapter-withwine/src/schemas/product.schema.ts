import { z } from "zod"

/**
 * WithWine product object, confirmed from a populated example in the backend API
 * collection (GET /api/wine/Products). Lenient (everything optional) so partial
 * payloads still parse. Personalization/social fields (isLiked, likeCount, etc.)
 * and the large nested `brand` object are intentionally omitted except for the
 * few fields we map.
 */
export const WwProductSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  brandId: z.number().optional(),
  name: z.string().optional().default(""),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coverPhotoPath: z.string().nullable().optional(),
  isSaleable: z.boolean().optional(),
  fullPrice: z.number().nullable().optional(),
  singlePrice: z.number().nullable().optional(),
  bottlePrice: z.number().nullable().optional(),
  halfDozenPrice: z.number().nullable().optional(),
  dozenPrice: z.number().nullable().optional(),
  state: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  vintage: z.union([z.string(), z.number()]).nullable().optional(),
  // Int enum (RedWine, WhiteWine, Champagne, FortifiedWine, Other, Cider).
  // TODO(withwine): confirm the int->name mapping before surfacing as wine.type.
  wineType: z.number().nullable().optional(),
  productType: z.string().nullable().optional(),
  discount: z.number().nullable().optional(),
  isFreeShipping: z.boolean().optional(),
  brand: z
    .object({
      name: z.string().nullable().optional(),
      paymentCurrency: z.string().nullable().optional(),
    })
    .partial()
    .optional(),
})

/** Pagination envelope returned by GET /api/wine/Products. */
export const WwProductListResponseSchema = z.object({
  currentPage: z.number().optional(),
  pageCount: z.number().optional(),
  pageSize: z.number().optional(),
  totalCount: z.number().optional(),
  data: z.array(z.unknown()).optional(),
})
