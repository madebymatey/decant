import type { Availability } from "@decant/core"
import { z } from "zod"

const OpAvailabilitySchema = z.object({
  productId: z.string(),
  inStock: z.boolean(),
  quantity: z.number().optional(),
})

export const mapOpAvailabilityToAvailability = (
  raw: unknown,
  fallbackProductId: string
): Availability => {
  const parsed = OpAvailabilitySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      productId: fallbackProductId,
      inStock: false,
    }
  }
  return parsed.data
}
