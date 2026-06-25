import { z } from "zod"

export const C7ProductSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().optional().default(""),
  slug: z.string().optional(),
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
})

export const C7ProductListResponseSchema = z.object({
  products: z.array(z.unknown()).optional(),
  cursor: z.union([z.string(), z.null()]).optional(),
})
