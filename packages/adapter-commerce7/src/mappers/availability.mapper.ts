import type { Availability } from "@decant/core"
import { z } from "zod"

const C7AvailabilitySchema = z.object({
  productId: z.string(),
  inStock: z.boolean(),
  quantity: z.number().optional(),
})

export const mapC7AvailabilityToAvailability = (
  raw: unknown,
  fallbackProductId: string
): Availability => {
  const parsed = C7AvailabilitySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      productId: fallbackProductId,
      inStock: false,
    }
  }
  return parsed.data
}
