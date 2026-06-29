import { defineConfig } from "@decant/core"
import { WithWineAdapter } from "@decant/adapter-withwine"
import { slugify, toCmsRecords, toFramerProducts, type CmsProductRecord } from "@decant/framer"
import type { Project } from "@/db/schema"
import { type FeedKind } from "@/lib/feed-kinds"

export { FEED_KINDS, FEED_META, isFeedKind, type FeedKind } from "@/lib/feed-kinds"

export type OptionRecord = { slug: string; name: string }
export type FeedPayload = CmsProductRecord[] | OptionRecord[]

function adapterFor(project: Project, platformApiKey: string): WithWineAdapter {
  return new WithWineAdapter(
    defineConfig({
      platform: "withwine",
      storeId: project.platformStoreId ?? "",
      apiKey: platformApiKey,
      apiUrl: project.platformApiUrl || undefined,
      assetBaseUrl: project.platformAssetUrl || undefined,
      currency: project.currency,
      locale: project.locale,
    })
  )
}

function options(records: CmsProductRecord[], pick: (r: CmsProductRecord) => string | number | null | undefined): OptionRecord[] {
  const bySlug = new Map<string, string>()
  for (const r of records) {
    const v = pick(r)
    if (v == null || v === "") continue
    const display = String(v)
    const s = slugify(display)
    if (s) bySlug.set(s, display)
  }
  return [...bySlug].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
}

/** Build one feed for a project. Fetches the catalog once per call. */
export async function buildFeed(
  project: Project,
  platformApiKey: string,
  kind: FeedKind
): Promise<FeedPayload> {
  const records = toCmsRecords(
    toFramerProducts(await adapterFor(project, platformApiKey).getProducts(), {
      locale: project.locale,
    })
  )
  switch (kind) {
    case "products":
      return records
    case "wine-types":
      return options(records, (r) => r.wineType)
    case "varietals":
      return options(records, (r) => r.varietal)
    case "vintage":
      return options(records, (r) => r.vintage)
    case "region":
      return options(records, (r) => r.region)
  }
}
