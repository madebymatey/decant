import { z } from "zod"

export const OpOrderResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  cartId: z.union([z.string(), z.number()]).transform(String),
  status: z.string().default("pending"),
  createdAt: z.string(),
  total: z.number(),
  currency: z.string().optional(),
})
