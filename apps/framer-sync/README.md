# Decant Sync (light Framer CMS sync plugin)

A minimal Framer plugin that syncs the decant feed into two **managed
collections** and links them with a real CMS reference — the thing a generic
"Custom API" sync can't do.

- **Wine Types** ← `/api/feed/wine-types?all=true` (item `id` = slug)
- **Varietals** ← `/api/feed/varietals` (item `id` = slug)
- **Products** ← `/api/feed/products`, including **Wine Type** and **Varietal**
  (single) `collectionReference` fields populated from each product's `wineType`
  and `varietal` slug.

Because one plugin manages all collections, Framer allows the references between
them. Managed collections reference items **by id**, and we set each option's
item id to its slug, so `wineType: "red"` resolves directly to the `red` Wine
Types item — no fuzzy matching. (Varietals is optional: if you haven't synced a
Varietals collection, Products simply omits that reference field.)

## Develop

```bash
pnpm install                  # from the repo root
pnpm -C apps/framer-sync dev  # serves the plugin over https (mkcert)
```

In Framer: **Plugins → Open Development Plugin** and point it at the dev URL Vite
prints.

## Workflow (run once per collection)

Framer only lets a plugin write the **active** managed collection, in
`syncManagedCollection` mode — so you sync each dataset into its own collection:

1. Create a CMS Collection, sync it with **Decant Sync**, pick dataset
   **Wine Types**, click **Sync Wine Types**. (This saves the collection's id to
   plugin data so the reference can target it.)
2. (Optional) Repeat for **Varietals** in a third collection.
3. Create another CMS Collection, sync it with **Decant Sync**, pick dataset
   **Products**, click **Sync Products**. Its `Wine Type` (and `Varietal`, if
   synced) reference is populated from each product's `wineType` / `varietal`
   slug.

Order matters: **option collections before Products**. The default feed base URL is
`https://template-withwine.vercel.app` (editable in the UI). Set a feed key only
if the deployment has `FEED_KEY` configured. Re-syncing updates items in place
and prunes ones no longer in the feed; the chosen dataset is remembered per
collection.

## Build

```bash
pnpm -C apps/framer-sync build
```

## Notes / caveats

- Runs in the Framer editor on demand (not a headless server cron).
- It **replaces** the "Custom API" sync for the Products and Wine Types
  collections — don't run both against the same collections.
- `images[]` (the product image gallery) has no native managed-collection field
  type, so only the primary `image` is mapped.
- API surface used: `framer.getActiveManagedCollection()`,
  `framer.getPluginData/setPluginData`, and
  `ManagedCollection.setFields/addItems/getItemIds/removeItems/setPluginData`.
  The Wine Types collection id is stored via plugin data on its sync and read
  back when Products syncs (see `src/sync.ts`).
