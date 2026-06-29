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
import { resolvedConfig } from "../../withwine.config"

/**
 * Headless CMS sync via Framer's Server API (`framer-api`).
 *
 * Runs on the server (cron / on-demand) without opening Framer. It owns a set of
 * "option" collections — Wine Types, Varietals, Vintage, Region — plus Products,
 * and links each product to its options via `collectionReference` fields. A
 * reference value is the target item's Framer **id**, so after syncing each
 * option collection we read back its slug -> id map and use those ids.
 *
 * Auth: `framer-api` reads the API key from FRAMER_API_KEY.
 * Target: FRAMER_PROJECT_URL (e.g. https://framer.com/projects/Site--aabb1122).
 *
 * Collections here should be dedicated to this sync (don't also manage them with
 * another tool, or writes will conflict).
 */

export type SyncResult = {
  wineTypes: number
  varietals: number
  vintages: number
  regions: number
  products: number
}

/**
 * Collection names this sync owns. Configurable so a test run can target NEW
 * collections instead of clobbering ones another tool (e.g. FramerSync) already
 * manages. ⚠️ If a name matches an existing collection, this sync writes to and
 * prunes it — use fresh names until you're ready to cut over.
 */
const COLLECTION_NAMES = {
  wineTypes: process.env.FRAMER_WINETYPES_COLLECTION ?? "Wine Types",
  varietals: process.env.FRAMER_VARIETALS_COLLECTION ?? "Varietals",
  vintages: process.env.FRAMER_VINTAGE_COLLECTION ?? "Vintage",
  regions: process.env.FRAMER_REGION_COLLECTION ?? "Region",
  products: process.env.FRAMER_PRODUCTS_COLLECTION ?? "Products",
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
// A reference value is the target item's Framer id; omit when there's no match.
const ref = (id: string | undefined): FieldDataEntryInput | undefined =>
  id ? { type: "collectionReference", value: id } : undefined

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

/**
 * Ensure the named fields exist with the right type; return a name -> fieldId
 * map. Fields whose type changed (e.g. Vintage from number to reference) are
 * dropped and recreated so the schema matches.
 */
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

/** Upsert items by slug (update if the slug exists, else create) and prune. */
async function upsertItems(
  collection: Collection,
  rows: { slug: string; fieldData: FieldDataInput }[]
): Promise<void> {
  const existing = await collection.getItems()
  const idBySlug = new Map(existing.map((it) => [it.slug, it.id]))

  const items: CollectionItemInput[] = rows.map((r) => {
    const id = idBySlug.get(r.slug)
    return id
      ? { id, slug: r.slug, fieldData: r.fieldData }
      : { slug: r.slug, fieldData: r.fieldData }
  })
  if (items.length > 0) await collection.addItems(items)

  const keep = new Set(rows.map((r) => r.slug))
  const stale = existing.filter((it) => !keep.has(it.slug)).map((it) => it.id)
  if (stale.length > 0) await collection.removeItems(stale)
}

/**
 * Sync a single-field "option" collection (just a Name) from a slug -> display
 * map. Returns the collection id (for reference field targets) and the resulting
 * slug -> item id map (for reference values).
 */
async function syncOptionCollection(
  framer: Framer,
  name: string,
  bySlug: Map<string, string>
): Promise<{ collectionId: string; idBySlug: Map<string, string> }> {
  const collection = await ensureCollection(framer, name)
  const fields = await ensureFields(collection, [{ type: "string", name: "Name" }])
  await upsertItems(
    collection,
    [...bySlug].map(([slug, display]) => ({
      slug,
      fieldData: compact({ [fields.get("Name")!]: str(display) }),
    }))
  )
  return { collectionId: collection.id, idBySlug: await slugIdMap(collection) }
}

/** Read a collection's current items as a slug -> Framer item id map. */
async function slugIdMap(collection: Collection): Promise<Map<string, string>> {
  const items = await collection.getItems()
  return new Map(items.map((it) => [it.slug, it.id]))
}

// --- Sync ----------------------------------------------------------------------

/**
 * HTTP headers must be Latin-1. A non-ASCII char (e.g. a Cyrillic homoglyph
 * pasted into a credential) throws a cryptic "ByteString" error deep in fetch.
 * Catch it early and name the exact variable + position, without leaking the value.
 */
function assertHeaderSafe(name: string, value: string | undefined): void {
  if (!value) return
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code > 255) {
      throw new Error(
        `${name} has a non-ASCII character at index ${i} (char code ${code}). ` +
          `Likely a copy-paste homoglyph — retype that character as plain ASCII.`
      )
    }
  }
}

/** Add a slug -> display entry to an option map, skipping empty values. */
function addOption(map: Map<string, string>, value: string | null | undefined): void {
  if (!value) return
  const s = slugify(value)
  if (s) map.set(s, value)
}

export async function syncToFramer(): Promise<SyncResult> {
  const projectUrl = process.env.FRAMER_PROJECT_URL
  if (!projectUrl) throw new Error("FRAMER_PROJECT_URL is not set")
  if (!process.env.FRAMER_API_KEY) throw new Error("FRAMER_API_KEY is not set")

  // Fail fast with a precise, value-safe message if any credential is tainted.
  assertHeaderSafe("FRAMER_PROJECT_URL", process.env.FRAMER_PROJECT_URL)
  assertHeaderSafe("FRAMER_API_KEY", process.env.FRAMER_API_KEY)
  assertHeaderSafe("PLATFORM_API_KEY", process.env.PLATFORM_API_KEY)
  assertHeaderSafe("PLATFORM_STORE_ID", process.env.PLATFORM_STORE_ID)

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

  return withConnection(projectUrl, async (framer) => {
    // Option collections first — references need their item ids.
    const wineTypes = await syncOptionCollection(framer, COLLECTION_NAMES.wineTypes, wineTypeBySlug)
    const varietals = await syncOptionCollection(framer, COLLECTION_NAMES.varietals, varietalBySlug)
    const vintages = await syncOptionCollection(framer, COLLECTION_NAMES.vintages, vintageBySlug)
    const regions = await syncOptionCollection(framer, COLLECTION_NAMES.regions, regionBySlug)

    // Products, with each option linked as a reference (by item id).
    const productsCol = await ensureCollection(framer, COLLECTION_NAMES.products)
    const pf = await ensureFields(productsCol, [
      { type: "string", name: "Product ID" },
      { type: "string", name: "Name" },
      { type: "string", name: "Description" },
      { type: "number", name: "Price" },
      { type: "string", name: "Price Label" },
      { type: "image", name: "Image" },
      { type: "string", name: "Category" },
      { type: "collectionReference", name: "Wine Type", collectionId: wineTypes.collectionId },
      { type: "collectionReference", name: "Varietal", collectionId: varietals.collectionId },
      { type: "collectionReference", name: "Vintage", collectionId: vintages.collectionId },
      { type: "collectionReference", name: "Region", collectionId: regions.collectionId },
      { type: "boolean", name: "Available" },
      { type: "string", name: "Appellation" },
      { type: "string", name: "Country Code" },
      { type: "string", name: "SKU" },
    ])
    await upsertItems(
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
          [pf.get("Wine Type")!]: ref(
            p.wineType ? wineTypes.idBySlug.get(slugify(p.wineType)) : undefined
          ),
          [pf.get("Varietal")!]: ref(
            p.varietal ? varietals.idBySlug.get(slugify(p.varietal)) : undefined
          ),
          [pf.get("Vintage")!]: ref(
            p.vintage != null ? vintages.idBySlug.get(slugify(String(p.vintage))) : undefined
          ),
          [pf.get("Region")!]: ref(
            p.region ? regions.idBySlug.get(slugify(p.region)) : undefined
          ),
          [pf.get("Available")!]: bool(p.available),
          [pf.get("Appellation")!]: str(p.appellation),
          [pf.get("Country Code")!]: str(p.countryCode),
          [pf.get("SKU")!]: str(p.sku),
        }),
      }))
    )

    return {
      wineTypes: wineTypeBySlug.size,
      varietals: varietalBySlug.size,
      vintages: vintageBySlug.size,
      regions: regionBySlug.size,
      products: products.length,
    }
  })
}
