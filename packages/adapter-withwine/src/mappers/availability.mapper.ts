import type { Availability } from "@decant/core"
import { z } from "zod"

const WwAvailabilitySchema = z.object({
  productId: z.string(),
  inStock: z.boolean(),
  quantity: z.number().optional(),
})

export const mapWwAvailabilityToAvailability = (
  raw: unknown,
  fallbackProductId: string
): Availability => {
  const parsed = WwAvailabilitySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      productId: fallbackProductId,
      inStock: false,
    }
  }
  return parsed.data
}
