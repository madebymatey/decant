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
  // Wine category. The live API returns this as a STRING name ("RedWine",
  // "WhiteWine", …) on wines and an int (e.g. 0) on non-wines (gift cards), so
  // accept both — declaring it number-only fails validation for every wine and
  // blanks the whole product. Unused downstream for now (see mapper).
  wineType: z.union([z.string(), z.number()]).nullable().optional(),
  // Grape variety. `varietyType` is the plain name ("Shiraz"); `varietyComposition`
  // holds blend detail when present. (`variety` is a nested object we don't need.)
  varietyType: z.string().nullable().optional(),
  varietyComposition: z.string().nullable().optional(),
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
