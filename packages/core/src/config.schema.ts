import { z } from "zod"

export const ConfigSchema = z.object({
  platform: z.enum(["commerce7", "orderport", "withwine"]),
  storeId: z.string().min(1),
  apiKey: z.string().min(1),
  apiUrl: z.string().url().optional(),
  assetBaseUrl: z.string().url().optional(),
  /** Public storefront base for hosted-checkout handoff (e.g. Commerce7). */
  storefrontUrl: z.string().url().optional(),
  currency: z.string().default("USD"),
  locale: z.string().default("en-US"),
})
