import { defineConfig } from "@decant/core"

/**
 * Validated, build-time-checked middleware config for a WithWine storefront.
 *
 * Generic core fields map onto WithWine concepts:
 *   storeId -> WithWine WineryBrandId (sent as the `id` query param)
 *   apiKey  -> WithWine clientId credential (server-side only; used as `clientid <token>`)
 *   apiUrl  -> base host (optional; defaults to https://secure.withwine.com)
 *
 * Set the PLATFORM_* env vars in Vercel (and .env.local for dev) before real
 * calls. The defaults below only exist so the app boots without secrets.
 */
export const resolvedConfig = defineConfig({
  platform: "withwine",
  storeId: process.env.PLATFORM_STORE_ID ?? "demo-brand",
  apiKey: process.env.PLATFORM_API_KEY ?? "demo-secret",
  apiUrl: process.env.PLATFORM_API_URL,
  assetBaseUrl: process.env.PLATFORM_ASSET_URL,
  currency: process.env.PLATFORM_CURRENCY ?? "USD",
  locale: process.env.PLATFORM_LOCALE ?? "en-US",
})
