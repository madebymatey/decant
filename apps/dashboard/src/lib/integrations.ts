/**
 * Per-integration UI descriptor — the single source of truth for how each
 * platform's generic config fields are labelled in the dashboard. Client-safe
 * (plain data, no server imports) so forms can import it directly.
 *
 * The keys MUST match the `platform` enum in `@decant/core` ConfigSchema
 * (validated server-side in provision.ts + createProjectAction). The generic
 * columns (platformStoreId / platformApiKey / platformApiUrl / platformAssetUrl)
 * are the same everywhere — only the copy and defaults change per platform.
 */

export const INTEGRATION_IDS = ["withwine", "commerce7", "orderport"] as const
export type IntegrationId = (typeof INTEGRATION_IDS)[number]

type FieldCopy = { label: string; hint?: string; placeholder?: string }

export type IntegrationDescriptor = {
  id: IntegrationId
  label: string
  catalogHeading: string
  storeId: FieldCopy
  apiKey: FieldCopy
  apiUrl: FieldCopy
  assetUrl: FieldCopy
  defaults: { currency: string; locale: string }
}

export const INTEGRATIONS: Record<IntegrationId, IntegrationDescriptor> = {
  withwine: {
    id: "withwine",
    label: "WithWine",
    catalogHeading: "WithWine catalog",
    storeId: { label: "Brand / store ID", hint: "WithWine WineryBrandId, e.g. 101.", placeholder: "101" },
    apiKey: {
      label: "Client ID (API key)",
      hint: "Format: brandslug-brandId-secret.",
      placeholder: "greenway-wines-101-…",
    },
    apiUrl: {
      label: "API base URL",
      hint: "Default https://secure.withwine.com",
      placeholder: "https://stage.withwine.com",
    },
    assetUrl: { label: "Asset base URL", placeholder: "https://stage-s3-cdn.withwine.com" },
    defaults: { currency: "AUD", locale: "en-AU" },
  },
  commerce7: {
    id: "commerce7",
    label: "Commerce7",
    catalogHeading: "Commerce7 catalog",
    storeId: {
      label: "Tenant ID",
      hint: "Your Commerce7 tenant slug — sent as the tenant header.",
      placeholder: "my-winery",
    },
    apiKey: {
      label: "API credentials",
      hint: "Format: appId:appSecret (App credentials, Basic auth).",
      placeholder: "appId:appSecret",
    },
    apiUrl: {
      label: "API base URL",
      hint: "Required. Commerce7 REST base.",
      placeholder: "https://api.commerce7.com/v1",
    },
    assetUrl: { label: "Asset base URL", hint: "Optional — leave blank if image URLs are absolute." },
    defaults: { currency: "USD", locale: "en-US" },
  },
  orderport: {
    id: "orderport",
    label: "OrderPort",
    catalogHeading: "OrderPort catalog",
    storeId: {
      label: "Store ID",
      hint: "OrderPort store identifier — sent as X-Store-Id.",
      placeholder: "store-123",
    },
    apiKey: { label: "API token", hint: "Bearer token for the OrderPort API.", placeholder: "Bearer token" },
    apiUrl: {
      label: "API base URL",
      hint: "Required. OrderPort REST base.",
      placeholder: "https://api.orderport.com",
    },
    assetUrl: { label: "Asset base URL", hint: "Optional — leave blank if image URLs are absolute." },
    defaults: { currency: "USD", locale: "en-US" },
  },
}

export const INTEGRATION_LIST: IntegrationDescriptor[] = INTEGRATION_IDS.map((id) => INTEGRATIONS[id])

export function isIntegrationId(value: string): value is IntegrationId {
  return (INTEGRATION_IDS as readonly string[]).includes(value)
}

/** Display label for an integration id, falling back to the raw id. */
export function integrationLabel(id: string): string {
  return isIntegrationId(id) ? INTEGRATIONS[id].label : id
}
