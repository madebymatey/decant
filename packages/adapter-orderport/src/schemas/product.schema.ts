import { z } from "zod"

export const OpProductSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().optional().default(""),
  description: z.string().optional(),
  sku: z.string().optional(),
  images: z.array(z.string()).optional(),
  price: z.number().nullable().optional(),
  currency: z.string().optional(),
})

export const OpProductListResponseSchema = z.object({
  items: z.array(z.unknown()).optional(),
  products: z.array(z.unknown()).optional(),
})
