/** Client-safe feed metadata (no server imports). */

export const FEED_KINDS = ["products", "wine-types", "varietals", "vintage", "region"] as const
export type FeedKind = (typeof FEED_KINDS)[number]

export function isFeedKind(value: string): value is FeedKind {
  return (FEED_KINDS as readonly string[]).includes(value)
}

export const FEED_META: Record<FeedKind, { label: string; description: string }> = {
  products: { label: "Products", description: "Flat CMS records — the main collection." },
  "wine-types": { label: "Wine Types", description: "Distinct wine types as options." },
  varietals: { label: "Varietals", description: "Distinct varietals as options." },
  vintage: { label: "Vintage", description: "Distinct vintages as options." },
  region: { label: "Region", description: "Distinct regions as options." },
}
