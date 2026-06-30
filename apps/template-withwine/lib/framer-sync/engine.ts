import {
  withConnection,
  type Collection,
  type CollectionItemInput,
  type CreateField,
  type FieldDataEntryInput,
  type FieldDataInput,
  type Framer,
} from "framer-api"
import { slugify, toCmsRecords, toFramerProducts } from "@decant/framer"
import { getCatalogProducts } from "../catalog"
import { resolvedConfig } from "../../storefront.config"

/**
 * Headless CMS sync via Framer's Server API (`framer-api`).
 *
 * Runs on the server (cron / on-demand) without opening Framer. It owns a set of
 * "option" collections — Wine Types, Varietals, Vintage, Region — plus Products,
 * and links each product to its options via reference fields.
 *
 * Collection names come from env (FRAMER_*_COLLECTION) by default, and can be
 * overridden per-call by `mappings` — the shape the Decant dashboard sends on
 * `POST /api/sync/run` so a project's collection config (names + single-vs-multi
 * reference) drives the sync. With no mappings the behaviour is unchanged.
 *
 * Auth: `framer-api` reads the API key from FRAMER_API_KEY.
 * Target: FRAMER_PROJECT_URL (e.g. https://framer.com/projects/Site--aabb1122).
 */

/** Add/update/delete counts, matching the dashboard's sync_run shape. */
export type SyncCounts = {
  added: number
  updated: number
  deleted: number
  failed: number
  skipped: number
}

/** Per-field override (single vs multi reference, on/off) for a collection. */
export type FieldOverrideInput = {
  field: string
  type: string
  enabled: boolean
}

/** One collection mapping as sent by the dashboard. */
export type MappingInput = {
  source: string
  framerCollectionName?: string
  fieldOverrides?: FieldOverrideInput[]
}

type SyncSource = "wineTypes" | "varietals" | "vintages" | "regions" | "products"

/** Default collection names — env first, then a sensible label. */
const DEFAULT_COLLECTION_NAMES: Record<SyncSource, string> = {
  wineTypes: process.env.FRAMER_WINETYPES_COLLECTION ?? "Wine Types",
  varietals: process.env.FRAMER_VARIETALS_COLLECTION ?? "Varietals",
  vintages: process.env.FRAMER_VINTAGE_COLLECTION ?? "Vintage",
  regions: process.env.FRAMER_REGION_COLLECTION ?? "Region",
  products: process.env.FRAMER_PRODUCTS_COLLECTION ?? "Products",
}

/** The dashboard's source keys → this engine's collection keys. */
const SOURCE_ALIASES: Record<string, SyncSource> = {
  wineTypes: "wineTypes",
  varietals: "varietals",
  vintage: "vintages",
  vintages: "vintages",
  region: "regions",
  regions: "regions",
  products: "products",
}

const REFERENCE_FIELDS = ["Wine Type", "Varietal", "Vintage", "Region"] as const
type ReferenceFieldName = (typeof REFERENCE_FIELDS)[number]

type Resolved = {
  names: Record<SyncSource, string>
  productOverrides: Map<string, FieldOverrideInput>
}

function resolve(mappings: MappingInput[] | undefined): Resolved {
  const names = { ...DEFAULT_COLLECTION_NAMES }
  const productOverrides = new Map<string, FieldOverrideInput>()
  for (const m of mappings ?? []) {
    const key = SOURCE_ALIASES[m.source]
    if (!key) continue
    if (m.framerCollectionName) names[key] = m.framerCollectionName
    if (key === "products") {
      for (const o of m.fieldOverrides ?? []) productOverrides.set(o.field, o)
    }
  }
  return { names, productOverrides }
}

function isMulti(overrides: Map<string, FieldOverrideInput>, field: ReferenceFieldName): boolean {
  return overrides.get(field)?.type === "multiCollectionReference"
}

// --- Field-data builders (each entry needs a `type` discriminator) -------------

const str = (v: string | null | undefined): FieldDataEntryInput | undefined =>
  v == null ? undefined : { type: "string", value: v }
const num = (v: number | null | undefined): FieldDataEntryInput | undefined =>
  v == null ? undefined : { type: "number", value: v }
const bool = (v: boolean | null | undefined): FieldDataEntryInput | undefined =>
  v == null ? undefined : { type: "boolean", value: v }
const image = (v: string | null | undefined): FieldDataEntryInput | undefined =>
  v ? { type: "image", value: v } : undefined
const singleRef = (id: string | undefined): FieldDataEntryInput | undefined =>
  id ? { type: "collectionReference", value: id } : undefined
const multiRef = (id: string | undefined): FieldDataEntryInput | undefined =>
  id ? { type: "multiCollectionReference", value: [id] } : undefined

function compact(
  entries: Record<string, FieldDataEntryInput | undefined>
): FieldDataInput {
  const out: FieldDataInput = {}
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v
  return out
}

// --- Collection / field / item helpers ----------------------------------------

async function ensureCollection(framer: Framer, name: string): Promise<Collection> {
  const all = await framer.getCollections()
  return all.find((c) => c.name === name) ?? (await framer.createCollection(name))
}

async function ensureFields(
  collection: Collection,
  desired: CreateField[]
): Promise<Map<string, string>> {
  const existing = await collection.getFields()
  const byName = new Map(existing.map((f) => [f.name, f]))
  const idByName = new Map<string, string>()
  const removeIds: string[] = []
  const toCreate: CreateField[] = []

  for (const d of desired) {
    const ex = byName.get(d.name)
    if (ex && ex.type === d.type) {
      idByName.set(d.name, ex.id)
    } else {
      if (ex) removeIds.push(ex.id) // type changed -> recreate
      toCreate.push(d)
    }
  }

  if (removeIds.length > 0) await collection.removeFields(removeIds)
  if (toCreate.length > 0) {
    const created = await collection.addFields(toCreate)
    for (const f of created) if (f.name) idByName.set(f.name, f.id)
  }
  return idByName
}

type Delta = { added: number; updated: number; deleted: number }

/** Upsert items by slug and prune stale ones; report add/update/delete counts. */
async function upsertItems(
  collection: Collection,
  rows: { slug: string; fieldData: FieldDataInput }[]
): Promise<Delta> {
  const existing = await collection.getItems()
  const idBySlug = new Map(existing.map((it) => [it.slug, it.id]))

  let added = 0
  let updated = 0
  const items: CollectionItemInput[] = rows.map((r) => {
    const id = idBySlug.get(r.slug)
    if (id) {
      updated++
      return { id, slug: r.slug, fieldData: r.fieldData }
    }
    added++
    return { slug: r.slug, fieldData: r.fieldData }
  })
  if (items.length > 0) await collection.addItems(items)

  const keep = new Set(rows.map((r) => r.slug))
  const stale = existing.filter((it) => !keep.has(it.slug)).map((it) => it.id)
  if (stale.length > 0) await collection.removeItems(stale)

  return { added, updated, deleted: stale.length }
}

async function syncOptionCollection(
  framer: Framer,
  name: string,
  bySlug: Map<string, string>
): Promise<{ collectionId: string; idBySlug: Map<string, string>; delta: Delta }> {
  const collection = await ensureCollection(framer, name)
  const fields = await ensureFields(collection, [{ type: "string", name: "Name" }])
  const delta = await upsertItems(
    collection,
    [...bySlug].map(([slug, display]) => ({
      slug,
      fieldData: compact({ [fields.get("Name")!]: str(display) }),
    }))
  )
  const items = await collection.getItems()
  return {
    collectionId: collection.id,
    idBySlug: new Map(items.map((it) => [it.slug, it.id])),
    delta,
  }
}

/**
 * HTTP headers must be Latin-1. A non-ASCII char (e.g. a Cyrillic homoglyph
 * pasted into a credential) throws a cryptic "ByteString" error deep in fetch.
 */
function assertHeaderSafe(name: string, value: string | undefined): void {
  if (!value) return
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) {
      throw new Error(
        `${name} has a non-ASCII character at index ${i} — likely a copy-paste homoglyph.`
      )
    }
  }
}

function addOption(map: Map<string, string>, value: string | null | undefined): void {
  if (!value) return
  const s = slugify(value)
  if (s) map.set(s, value)
}

// --- Sync ----------------------------------------------------------------------

const emptyCounts = (): SyncCounts => ({ added: 0, updated: 0, deleted: 0, failed: 0, skipped: 0 })

function accumulate(into: SyncCounts, delta: Delta): void {
  into.added += delta.added
  into.updated += delta.updated
  into.deleted += delta.deleted
}

/** Framer connection budget — under decant's 55s sync abort, far above a healthy ~8s sync. */
const FRAMER_CONNECT_TIMEOUT_MS = 40_000

const isLikelyFramerProjectUrl = (url: string): boolean =>
  /^https:\/\/(www\.)?framer\.com\/projects\/.+--.+/i.test(url.trim())

/** Reject `promise` if it doesn't settle within `ms`, with an actionable message. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${ms / 1000}s — check FRAMER_PROJECT_URL and FRAMER_API_KEY.`
          )
        ),
      ms
    )
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export async function syncToFramer(options?: { mappings?: MappingInput[] }): Promise<SyncCounts> {
  const projectUrl = process.env.FRAMER_PROJECT_URL
  if (!projectUrl) throw new Error("FRAMER_PROJECT_URL is not set")
  if (!process.env.FRAMER_API_KEY) throw new Error("FRAMER_API_KEY is not set")
  if (!isLikelyFramerProjectUrl(projectUrl)) {
    throw new Error(
      `FRAMER_PROJECT_URL doesn't look like a Framer project URL ` +
        `(expected https://framer.com/projects/<Name>--<ID>): ${projectUrl}`
    )
  }

  assertHeaderSafe("FRAMER_PROJECT_URL", process.env.FRAMER_PROJECT_URL)
  assertHeaderSafe("FRAMER_API_KEY", process.env.FRAMER_API_KEY)
  assertHeaderSafe("PLATFORM_API_KEY", process.env.PLATFORM_API_KEY)
  assertHeaderSafe("PLATFORM_STORE_ID", process.env.PLATFORM_STORE_ID)

  const resolved = resolve(options?.mappings)

  const products = toCmsRecords(
    toFramerProducts(await getCatalogProducts(), { locale: resolvedConfig.locale })
  )

  // Derive option lists (slug -> display) from the products.
  const wineTypeBySlug = new Map<string, string>()
  const varietalBySlug = new Map<string, string>()
  const vintageBySlug = new Map<string, string>()
  const regionBySlug = new Map<string, string>()
  for (const p of products) {
    addOption(wineTypeBySlug, p.wineType)
    addOption(varietalBySlug, p.varietal)
    if (p.vintage != null) addOption(vintageBySlug, String(p.vintage))
    addOption(regionBySlug, p.region)
  }

  const counts = emptyCounts()

  const run = withConnection(projectUrl, async (framer) => {
    // Option collections first — references need their item ids.
    const wineTypes = await syncOptionCollection(framer, resolved.names.wineTypes, wineTypeBySlug)
    const varietals = await syncOptionCollection(framer, resolved.names.varietals, varietalBySlug)
    const vintages = await syncOptionCollection(framer, resolved.names.vintages, vintageBySlug)
    const regions = await syncOptionCollection(framer, resolved.names.regions, regionBySlug)
    accumulate(counts, wineTypes.delta)
    accumulate(counts, varietals.delta)
    accumulate(counts, vintages.delta)
    accumulate(counts, regions.delta)

    // Reference field type follows the override (single vs multi).
    const refField = (name: ReferenceFieldName, collectionId: string): CreateField => ({
      type: isMulti(resolved.productOverrides, name)
        ? "multiCollectionReference"
        : "collectionReference",
      name,
      collectionId,
    })
    const refValue = (name: ReferenceFieldName, id: string | undefined) =>
      isMulti(resolved.productOverrides, name) ? multiRef(id) : singleRef(id)

    const productsCol = await ensureCollection(framer, resolved.names.products)
    const pf = await ensureFields(productsCol, [
      { type: "string", name: "Product ID" },
      { type: "string", name: "Name" },
      { type: "string", name: "Description" },
      { type: "number", name: "Price" },
      { type: "string", name: "Price Label" },
      { type: "image", name: "Image" },
      { type: "string", name: "Category" },
      refField("Wine Type", wineTypes.collectionId),
      refField("Varietal", varietals.collectionId),
      refField("Vintage", vintages.collectionId),
      refField("Region", regions.collectionId),
      { type: "boolean", name: "Available" },
      { type: "string", name: "Appellation" },
      { type: "string", name: "Country Code" },
      { type: "string", name: "SKU" },
    ])
    const delta = await upsertItems(
      productsCol,
      products.map((p) => ({
        slug: p.slug,
        fieldData: compact({
          [pf.get("Product ID")!]: str(p.id),
          [pf.get("Name")!]: str(p.name),
          [pf.get("Description")!]: str(p.description),
          [pf.get("Price")!]: num(p.price),
          [pf.get("Price Label")!]: str(p.priceLabel),
          [pf.get("Image")!]: image(p.image),
          [pf.get("Category")!]: str(p.category),
          [pf.get("Wine Type")!]: refValue(
            "Wine Type",
            p.wineType ? wineTypes.idBySlug.get(slugify(p.wineType)) : undefined
          ),
          [pf.get("Varietal")!]: refValue(
            "Varietal",
            p.varietal ? varietals.idBySlug.get(slugify(p.varietal)) : undefined
          ),
          [pf.get("Vintage")!]: refValue(
            "Vintage",
            p.vintage != null ? vintages.idBySlug.get(slugify(String(p.vintage))) : undefined
          ),
          [pf.get("Region")!]: refValue(
            "Region",
            p.region ? regions.idBySlug.get(slugify(p.region)) : undefined
          ),
          [pf.get("Available")!]: bool(p.available),
          [pf.get("Appellation")!]: str(p.appellation),
          [pf.get("Country Code")!]: str(p.countryCode),
          [pf.get("SKU")!]: str(p.sku),
        }),
      }))
    )
    accumulate(counts, delta)

    return counts
  })

  return withTimeout(run, FRAMER_CONNECT_TIMEOUT_MS, "Framer sync")
}
