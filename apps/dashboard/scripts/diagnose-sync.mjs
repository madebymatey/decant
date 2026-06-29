// Standalone sync diagnostic — runs the two legs of a project's sync separately
// so we can see exactly which one fails and why.
//
// Usage:
//   node --env-file=apps/dashboard/.env apps/dashboard/scripts/diagnose-sync.mjs [slug]
//
// Needs DATABASE_URL + SECRETS_ENCRYPTION_KEY from .env. Secrets are masked.

import { neon } from "@neondatabase/serverless"
import { createDecipheriv } from "node:crypto"
import { defineConfig } from "@decant/core"
import { WithWineAdapter } from "@decant/adapter-withwine"

const slugArg = process.argv[2]

function key() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY
  if (!raw) throw new Error("SECRETS_ENCRYPTION_KEY not set")
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex")
  return Buffer.from(raw, "base64")
}
function decrypt(payload) {
  const [iv, tag, data] = payload.split(".")
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"))
  d.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8")
}
const mask = (v) => (!v ? "(missing)" : v.length <= 6 ? "••••" : "••••" + v.slice(-4))

const sql = neon(process.env.DATABASE_URL)

const projects = slugArg
  ? await sql`select * from "project" where slug = ${slugArg}`
  : await sql`select * from "project" order by "createdAt" limit 1`

if (projects.length === 0) {
  console.error("No project found", slugArg ? `for slug "${slugArg}"` : "")
  process.exit(1)
}
const p = projects[0]
const secrets = await sql`select name, ciphertext from "project_secret" where "projectId" = ${p.id}`
const sec = Object.fromEntries(secrets.map((s) => [s.name, decrypt(s.ciphertext)]))

console.log("\n── Project:", p.name, `(/${p.slug})`)
console.log("  platformStoreId :", p.platformStoreId || "(missing)")
console.log("  platformApiUrl  :", p.platformApiUrl || "(default)")
console.log("  platformApiKey  :", mask(sec.platformApiKey))
console.log("  framerProjectUrl:", p.framerProjectUrl || "(missing)")
console.log("  framerApiKey    :", mask(sec.framerApiKey))

const urlOk = /^https:\/\/framer\.com\/projects\/.+--[A-Za-z0-9]+$/.test(p.framerProjectUrl ?? "")
console.log(
  "  → URL format    :",
  urlOk ? "looks valid" : "⚠️  expected https://framer.com/projects/<Name>--<ID>"
)

// Leg 1: WithWine catalog
console.log("\n── Leg 1: WithWine catalog fetch")
try {
  const adapter = new WithWineAdapter(
    defineConfig({
      platform: "withwine",
      storeId: p.platformStoreId ?? "",
      apiKey: sec.platformApiKey ?? "",
      apiUrl: p.platformApiUrl || undefined,
      assetBaseUrl: p.platformAssetUrl || undefined,
      currency: p.currency,
      locale: p.locale,
    })
  )
  const products = await adapter.getProducts()
  console.log(`  ✓ fetched ${products.length} products`)
} catch (e) {
  console.log("  ✗ FAILED:", e instanceof Error ? e.message : e)
}

// Leg 2: Framer connection
console.log("\n── Leg 2: Framer connection")
try {
  const { withConnection } = await import("framer-api")
  const info = await withConnection(
    p.framerProjectUrl,
    async (framer) => framer.getProjectInfo(),
    sec.framerApiKey
  )
  console.log("  ✓ connected. Project info:", JSON.stringify(info))
} catch (e) {
  console.log("  ✗ FAILED:", e instanceof Error ? e.message : e)
  if (e?.stack) console.log(e.stack.split("\n").slice(0, 4).join("\n"))
}

process.exit(0)
