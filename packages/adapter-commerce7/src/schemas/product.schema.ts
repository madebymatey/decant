import { z } from "zod"

/** Commerce7's standardized nested wine block. */
export const C7WineSchema = z.object({
  type: z.string().nullable().optional(),
  varietal: z.string().nullable().optional(),
  vintage: z.union([z.number(), z.string()]).nullable().optional(),
  region: z.string().nullable().optional(),
  appellation: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
})

export const C7ProductSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().optional().default(""),
  slug: z.string().optional(),
  content: z.string().nullable().optional(),
  teaser: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  images: z.array(z.object({ src: z.string().optional() })).optional(),
  variants: z
    .array(
      z.object({
        price: z.number().nullable().optional(),
        comparePrice: z.number().nullable().optional(),
      })
    )
    .optional(),
  webStatus: z.string().nullable().optional(),
  wine: C7WineSchema.nullable().optional(),
})

export const C7ProductListResponseSchema = z.object({
  products: z.array(z.unknown()).optional(),
  cursor: z.union([z.string(), z.null()]).optional(),
})
