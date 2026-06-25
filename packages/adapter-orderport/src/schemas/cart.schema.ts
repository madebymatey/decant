import { z } from "zod"

export const OpCartResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  currency: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.union([z.string(), z.number()]).transform(String),
        quantity: z.number(),
        variantId: z.string().optional(),
      })
    )
    .default([]),
})
