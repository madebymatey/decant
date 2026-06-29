import {
  framer,
  type FieldDataEntryInput,
  type FieldDataInput,
  type ManagedCollection,
  type ManagedCollectionFieldInput,
} from "framer-plugin"
import {
  fetchProducts,
  fetchVarietals,
  fetchWineTypes,
  type CmsProductRecord,
  type VarietalRecord,
  type WineTypeRecord,
} from "./feed"
import { slugify } from "./slug"

/**
 * Light, single-source CMS sync for the decant feed.
 *
 * Framer only allows writing managed collections in `syncManagedCollection` /
 * `configureManagedCollection` mode, where the plugin operates on the ACTIVE
 * collection and is run once per collection. So this is modelled as datasets
 * the user syncs into separate collections:
 *
 *   - "wineTypes" -> a Wine Types collection (item id = slug)
 *   - "varietals" -> a Varietals collection (item id = slug)
 *   - "products"  -> a Products collection, whose `wineType` and `varietal`
 *     (single) collectionReference fields point back at those collections.
 *
 * References between managed collections are only legal when both are managed by
 * the same plugin (they are), and items are referenced BY ID. We set option
 * item ids = slugs, so each product's `wineType` / `varietal` slug resolves
 * directly — no fuzzy matching.
 *
 * The reference fields need the target collections' ids, so each option
 * collection saves its id to plugin data on sync; the Products sync reads them
 * back. Hence option collections must be synced before Products.
 */

export type Logger = (message: string) => void
export type Dataset = "wineTypes" | "varietals" | "products"

/** Per-collection sync configuration, persisted so re-syncs (incl. headless
 * ones Framer triggers) can run without re-entering anything. */
export type SyncConfig = {
  dataset: Dataset
  baseUrl: string
  feedKey?: string
}

// Plugin-level storage of the option collection ids, so the Products sync can
// target them with reference fields.
const WINE_TYPES_ID_KEY = "decant:wineTypesCollectionId"
const VARIETALS_ID_KEY = "decant:varietalsCollectionId"
// Per-collection persisted sync config.
const CONFIG_KEY = "decant:config"

/** Read a collection's saved sync config, or null if it has never been set. */
export async function loadCollectionConfig(
  collection: ManagedCollection
): Promise<SyncConfig | null> {
  const raw = await collection.getPluginData(CONFIG_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SyncConfig
    return parsed?.dataset && parsed?.baseUrl ? parsed : null
  } catch {
    return null
  }
}

async function saveCollectionConfig(
  collection: ManagedCollection,
  config: SyncConfig
): Promise<void> {
  await collection.setPluginData(CONFIG_KEY, JSON.stringify(config))
}

// --- Typed field-data builders -------------------------------------------------
// Each fieldData entry must carry a `type` matching its field's type. Nullish
// values are dropped (returned undefined) and omitted from the record.

const str = (value: string | null | undefined): FieldDataEntryInput | undefined =>
  value == null ? undefined : { type: "string", value }

const num = (value: number | null | undefined): FieldDataEntryInput | undefined =>
  value == null ? undefined : { type: "number", value }

const bool = (value: boolean | null | undefined): FieldDataEntryInput | undefined =>
  value == null ? undefined : { type: "boolean", value }

const image = (value: string | null | undefined): FieldDataEntryInput | undefined =>
  value ? { type: "image", value } : undefined

const ref = (value: string): FieldDataEntryInput => ({
  type: "collectionReference",
  value: value || null,
})

/** Assemble a FieldDataInput, dropping omitted (undefined) entries. */
function compact(
  entries: Record<string, FieldDataEntryInput | undefined>
): FieldDataInput {
  const out: FieldDataInput = {}
  for (const [key, entry] of Object.entries(entries)) {
    if (entry) out[key] = entry
  }
  return out
}

/** Remove items present in the collection but no longer in the source feed. */
async function pruneStale(collection: ManagedCollection, keepIds: string[]): Promise<void> {
  const keep = new Set(keepIds)
  const existing = await collection.getItemIds()
  const stale = existing.filter((id) => !keep.has(id))
  if (stale.length > 0) await collection.removeItems(stale)
}

async function syncWineTypes(
  collection: ManagedCollection,
  baseUrl: string,
  key: string | undefined,
  log: Logger
): Promise<void> {
  await collection.setFields([
    { id: "name", name: "Name", type: "string" },
    { id: "count", name: "Count", type: "number" },
  ])

  const types: WineTypeRecord[] = await fetchWineTypes(baseUrl, key)
  log(`Fetched ${types.length} wine types`)

  await collection.addItems(
    types.map((t) => ({
      id: t.slug, // id = slug so product references resolve directly
      slug: t.slug,
      fieldData: compact({ name: str(t.name), count: num(t.count) }),
    }))
  )
  await pruneStale(collection, types.map((t) => t.slug))

  await framer.setPluginData(WINE_TYPES_ID_KEY, collection.id)
}

async function syncVarietals(
  collection: ManagedCollection,
  baseUrl: string,
  key: string | undefined,
  log: Logger
): Promise<void> {
  await collection.setFields([{ id: "name", name: "Name", type: "string" }])

  const varietals: VarietalRecord[] = await fetchVarietals(baseUrl, key)
  log(`Fetched ${varietals.length} varietals`)

  await collection.addItems(
    varietals.map((v) => ({
      id: v.slug,
      slug: v.slug,
      fieldData: compact({ name: str(v.name) }),
    }))
  )
  await pruneStale(collection, varietals.map((v) => v.slug))

  await framer.setPluginData(VARIETALS_ID_KEY, collection.id)
}

async function syncProducts(
  collection: ManagedCollection,
  baseUrl: string,
  key: string | undefined,
  log: Logger
): Promise<void> {
  const wineTypesCollectionId = await framer.getPluginData(WINE_TYPES_ID_KEY)
  if (!wineTypesCollectionId) {
    throw new Error(
      "Sync the Wine Types collection first (its id is needed for the reference)."
    )
  }
  // Varietals reference is optional — only added if a Varietals collection has
  // been synced.
  const varietalsCollectionId = await framer.getPluginData(VARIETALS_ID_KEY)

  // Full CmsProductRecord mapping. `images[]` has no native managed-collection
  // field type, so only the primary `image` is mapped. `wineType` / `varietal`
  // slug arrays power the references.
  const fields: ManagedCollectionFieldInput[] = [
    { id: "name", name: "Name", type: "string" },
    { id: "description", name: "Description", type: "string" },
    { id: "price", name: "Price", type: "number" },
    { id: "priceLabel", name: "Price Label", type: "string" },
    { id: "compareAtPrice", name: "Compare At Price", type: "number" },
    { id: "compareAtLabel", name: "Compare At Label", type: "string" },
    { id: "currency", name: "Currency", type: "string" },
    { id: "image", name: "Image", type: "image" },
    { id: "category", name: "Category", type: "string" },
    {
      id: "wineType",
      name: "Wine Type",
      type: "collectionReference",
      collectionId: wineTypesCollectionId,
    },
    { id: "available", name: "Available", type: "boolean" },
    { id: "vintage", name: "Vintage", type: "number" },
    { id: "region", name: "Region", type: "string" },
    { id: "appellation", name: "Appellation", type: "string" },
    { id: "countryCode", name: "Country Code", type: "string" },
    { id: "sku", name: "SKU", type: "string" },
  ]
  if (varietalsCollectionId) {
    fields.push({
      id: "varietal",
      name: "Varietal",
      type: "collectionReference",
      collectionId: varietalsCollectionId,
    })
  }
  await collection.setFields(fields)

  const products: CmsProductRecord[] = await fetchProducts(baseUrl, key)
  log(`Fetched ${products.length} products`)

  await collection.addItems(
    products.map((p) => ({
      id: p.id,
      slug: p.slug,
      fieldData: compact({
        name: str(p.name),
        description: str(p.description),
        price: num(p.price),
        priceLabel: str(p.priceLabel),
        compareAtPrice: num(p.compareAtPrice),
        compareAtLabel: str(p.compareAtLabel),
        currency: str(p.currency),
        image: image(p.image),
        category: str(p.category),
        // Reference values: option item id (= slug). The feed sends display
        // values, so slugify to match the option collections' item ids.
        wineType: ref(slugify(p.wineType)),
        varietal: varietalsCollectionId ? ref(slugify(p.varietal)) : undefined,
        available: bool(p.available),
        vintage: num(p.vintage),
        region: str(p.region),
        appellation: str(p.appellation),
        countryCode: str(p.countryCode),
        sku: str(p.sku),
      }),
    }))
  )
  await pruneStale(collection, products.map((p) => p.id))
}

/** Sync one dataset into the given active managed collection. */
export async function syncDataset(
  dataset: Dataset,
  collection: ManagedCollection,
  baseUrl: string,
  key: string | undefined,
  log: Logger
): Promise<void> {
  // Persist the config so future (incl. Framer-triggered headless) syncs can
  // run without re-entering anything.
  await saveCollectionConfig(collection, { dataset, baseUrl, feedKey: key })

  if (dataset === "wineTypes") {
    log("Syncing Wine Types…")
    await syncWineTypes(collection, baseUrl, key, log)
  } else if (dataset === "varietals") {
    log("Syncing Varietals…")
    await syncVarietals(collection, baseUrl, key, log)
  } else {
    log("Syncing Products…")
    await syncProducts(collection, baseUrl, key, log)
  }
  log("Sync complete ✓")
}

/**
 * Run a sync using the collection's saved config. Returns false if the
 * collection has never been configured (caller should show the setup UI).
 * This is the entry point Framer's sync trigger uses for hands-off re-syncs.
 */
export async function syncFromSavedConfig(
  collection: ManagedCollection,
  log: Logger
): Promise<boolean> {
  const config = await loadCollectionConfig(collection)
  if (!config) return false
  await syncDataset(config.dataset, collection, config.baseUrl, config.feedKey, log)
  return true
}
