import { defineConfig, type Config } from "@decant/core"

/**
 * Validated, build-time-checked middleware config for a storefront deploy.
 *
 * One template, any integration: the `PLATFORM` env var selects which adapter
 * the runtime uses (see `lib/adapter.ts`). Generic core fields map onto each
 * platform's own concepts inside its adapter — e.g. for WithWine:
 *   storeId -> WineryBrandId (sent as the `id` query param)
 *   apiKey  -> clientId credential (server-side only; used as `clientid <token>`)
 *   apiUrl  -> base host (optional; the platform default applies when unset)
 *
 * Set PLATFORM + the PLATFORM_* env vars in Vercel (and .env.local for dev)
 * before real calls. The defaults below only exist so the app boots without
 * secrets. PLATFORM defaults to "withwine" so existing deploys keep working.
 */
const platform = (process.env.PLATFORM ?? "withwine") as Config["platform"]

export const resolvedConfig = defineConfig({
  platform,
  storeId: process.env.PLATFORM_STORE_ID ?? "demo-brand",
  apiKey: process.env.PLATFORM_API_KEY ?? "demo-secret",
  apiUrl: process.env.PLATFORM_API_URL,
  assetBaseUrl: process.env.PLATFORM_ASSET_URL,
  currency: process.env.PLATFORM_CURRENCY ?? "USD",
  locale: process.env.PLATFORM_LOCALE ?? "en-US",
})
