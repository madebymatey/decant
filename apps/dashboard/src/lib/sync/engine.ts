import type {
  Collection,
  CollectionItemInput,
  CreateField,
  FieldDataEntryInput,
  FieldDataInput,
  Framer,
} from "framer-api"
import { defineConfig } from "@decant/core"
import { WithWineAdapter } from "@decant/adapter-withwine"
import { slugify, toCmsRecords, toFramerProducts } from "@decant/framer"
import type { CollectionMapping, FieldOverride, Project, SyncCounts } from "@/db/schema"

/**
 * Config-driven Framer CMS sync, per project.
 *
 * This is the dashboard's multi-tenant equivalent of the single-tenant engine in
 * apps/template-withwine. Everything that the template hardcodes (collection
 * names, credentials, field types) is supplied at call time from the project's
 * DB record + collection mappings, so one engine serves every client.
 *
 * Auth/target are passed explicitly (NOT read from process.env):
 *   - platform catalog via `new WithWineAdapter(config)`
 *   - Framer via `withConnection(projectUrl, fn, framerApiKey)`
 */

export type SyncEngineInput = {
  project: Project
  platformApiKey: string
  framerApiKey: string
  mappings: CollectionMapping[]
}

/** The five sources this engine knows how to produce. */
export type SyncSource = "products" | "wineTypes" | "varietals" | "vintage" | "region"

const DEFAULT_COLLECTION_NAMES: Record<SyncSource, string> = {
  wineTypes: "Wine Types",
  varietals: "Varietals",
  vintage: "Vintage",
  region: "Region",
  products: "Products",
}

/** The four product→option reference fields whose cardinality is overridable. */
const REFERENCE_FIELDS = ["Wine Type", "Varietal", "Vintage", "Region"] as const
type ReferenceFieldName = (typeof REFERENCE_FIELDS)[number]

type ResolvedMapping = {
  /** target Framer collection name per source */
  names: Record<SyncSource, string>
  /** which sources are enabled */
  enabled: Record<SyncSource, boolean>
  /** product field overrides by field name */
  productOverrides: Map<string, FieldOverride>
}

function resolveMappings(mappings: CollectionMapping[]): ResolvedMapping {
  const names = { ...DEFAULT_COLLECTION_NAMES }
  const enabled: Record<SyncSource, boolean> = {
    products: true,
    wineTypes: true,
    varietals: true,
    vintage: true,
    region: true,
  }
  const productOverrides = new Map<string, FieldOverride>()

  for (const m of mappings) {
    const source = m.source as SyncSource
    if (source in names) {
      if (m.framerCollectionName) names[source] = m.framerCollectionName
      enabled[source] = m.enabled
      if (source === "products") {
        for (const o of m.fieldOverrides ?? []) productOverrides.set(o.field, o)
      }
    }
  }
  return { names, enabled, productOverrides }
}

/** Is a product→option field configured as multi-reference? */
function isMulti(overrides: Map<string, FieldOverride>, field: ReferenceFieldName): boolean {
  return overrides.get(field)?.type === "multiCollectionReference"
}

// ── Field-data builders ───────────────────────────────────────────────────────

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

function compact(entries: Record<string, FieldDataEntryInput | undefined>): FieldDataInput {
  const out: FieldDataInput = {}
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v
  return out
}

// ── Collection / field / item helpers ─────────────────────────────────────────

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
      if (ex) removeIds.push(ex.id) // type changed → recreate
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

type UpsertDelta = { added: number; updated: number; deleted: number }

/** Upsert items by slug and prune stale ones; report add/update/delete counts. */
async function upsertItems(
  collection: Collection,
  rows: { slug: string; fieldData: FieldDataInput }[]
): Promise<UpsertDelta> {
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
): Promise<{ collectionId: string; idBySlug: Map<string, string>; delta: UpsertDelta }> {
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
  return { collectionId: collection.id, idBySlug: new Map(items.map((it) => [it.slug, it.id])), delta }
}

function addOption(map: Map<string, string>, value: string | null | undefined): void {
  if (!value) return
  const s = slugify(value)
  if (s) map.set(s, value)
}

/** A non-ASCII char in a header credential throws a cryptic fetch error; name it. */
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

// ── Sync ──────────────────────────────────────────────────────────────────────

const emptyCounts = (): SyncCounts => ({ added: 0, updated: 0, deleted: 0, failed: 0, skipped: 0 })

function accumulate(into: SyncCounts, delta: UpsertDelta): void {
  into.added += delta.added
  into.updated += delta.updated
  into.deleted += delta.deleted
}

export async function runSync(input: SyncEngineInput): Promise<SyncCounts> {
  const { project, platformApiKey, framerApiKey } = input
  if (!project.framerProjectUrl) throw new Error("Project has no Framer project URL")
  if (!framerApiKey) throw new Error("Project has no Framer API key")
  if (!platformApiKey) throw new Error("Project has no platform API key")

  assertHeaderSafe("framerProjectUrl", project.framerProjectUrl)
  assertHeaderSafe("framerApiKey", framerApiKey)
  assertHeaderSafe("platformApiKey", platformApiKey)

  const resolved = resolveMappings(input.mappings)

  const config = defineConfig({
    platform: "withwine",
    storeId: project.platformStoreId ?? "",
    apiKey: platformApiKey,
    apiUrl: project.platformApiUrl || undefined,
    assetBaseUrl: project.platformAssetUrl || undefined,
    currency: project.currency,
    locale: project.locale,
  })

  // Loaded dynamically so framer-api (ESM + top-level await) never enters the
  // static module graph of the server-action bundle (Terser can't parse the
  // generated top-level await wrapper).
  const { withConnection } = await import("framer-api")

  const adapter = new WithWineAdapter(config)
  const products = toCmsRecords(
    toFramerProducts(await adapter.getProducts(), { locale: project.locale })
  )

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

  return withConnection(
    project.framerProjectUrl,
    async (framer) => {
      const wineTypes = await syncOptionCollection(framer, resolved.names.wineTypes, wineTypeBySlug)
      const varietals = await syncOptionCollection(framer, resolved.names.varietals, varietalBySlug)
      const vintages = await syncOptionCollection(framer, resolved.names.vintage, vintageBySlug)
      const regions = await syncOptionCollection(framer, resolved.names.region, regionBySlug)
      accumulate(counts, wineTypes.delta)
      accumulate(counts, varietals.delta)
      accumulate(counts, vintages.delta)
      accumulate(counts, regions.delta)

      // Reference field type follows the override (single vs multi).
      const refField = (name: ReferenceFieldName, collectionId: string): CreateField => ({
        type: isMulti(resolved.productOverrides, name) ? "multiCollectionReference" : "collectionReference",
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
    },
    framerApiKey
  )
}
