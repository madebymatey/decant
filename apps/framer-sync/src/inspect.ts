import { framer } from "framer-plugin"
import type { Logger } from "./sync"

/**
 * Read-only diagnostic: dumps every collection's fields and a sample of items
 * (id / slug / name) so we can see exactly what a reference field must match.
 *
 * Run this in CANVAS mode (Plugins menu on the canvas). It answers:
 *  - What are the Wine Types items' ids and slugs? (the value `"red"` must match)
 *  - Does the Products reference field point at the Wine Types collection?
 */
export async function inspectCollections(log: Logger): Promise<void> {
  const collections = await framer.getCollections()
  log(`Found ${collections.length} collection(s):`)

  for (const collection of collections) {
    log("")
    log(`▸ ${collection.name}  (id: ${collection.id})`)

    const fields = await collection.getFields()
    log("  fields:")
    for (const field of fields) {
      // Reference fields carry a target collectionId.
      const targetId = (field as { collectionId?: string }).collectionId
      const suffix = targetId ? `  → collection ${targetId}` : ""
      log(`   • ${field.id} : ${field.type}${suffix}`)
    }

    // Pick a likely display field so we can show a human label per item.
    const nameField = fields.find(
      (f) => f.type === "string" && /name|title/i.test(f.name ?? "")
    )

    const items = await collection.getItems()
    log(`  ${items.length} item(s); first ${Math.min(items.length, 8)}:`)
    for (const item of items.slice(0, 8)) {
      let label = ""
      if (nameField) {
        const entry = item.fieldData[nameField.id] as { value?: unknown } | undefined
        if (entry && typeof entry.value === "string") label = ` "${entry.value}"`
      }
      log(`   - id=${item.id}  slug=${item.slug}${label}`)
    }
  }

  log("")
  log("Done. Compare the Wine Types item slug to the value you're mapping.")
}
