# Framer CMS Server-API Sync

Headless sync from the decant catalog into Framer CMS using Framer's **Server
API** (`framer-api`) — no plugin, no open editor. Writes five collections —
**Wine Types**, **Varietals**, **Vintage**, **Region**, and **Products** — and
links each product to its options via `collectionReference` fields. A reference
value is the target item's Framer **id** (captured after each option collection
is synced), so the product references resolve correctly.

One engine ([engine.ts](engine.ts)), two triggers:

| Trigger | Endpoint | When |
|---|---|---|
| **Manual** | `POST /api/sync/run` | on demand (dev/testing) |
| **Scheduled** | `GET /api/cron/sync` (Vercel Cron) | the interval in `vercel.json`, only when enabled |

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `FRAMER_PROJECT_URL` | yes | Target project, e.g. `https://framer.com/projects/Site--aabbccdd1122` |
| `FRAMER_API_KEY` | yes | Created in your Framer **site settings**; read automatically by `framer-api` |
| `SYNC_SCHEDULE_ENABLED` | no | `"true"` enables the cron; anything else = cron is a no-op (default: manual only) |
| `SYNC_KEY` | recommended | Secret for `POST /api/sync/run` (`?key=` or `Authorization: Bearer`) |
| `CRON_SECRET` | recommended | When set, Vercel sends it as `Authorization: Bearer` on cron calls; we reject others |
| `FRAMER_WINETYPES_COLLECTION` | no | Override the Wine Types collection name (default `Wine Types`) |
| `FRAMER_VARIETALS_COLLECTION` | no | Override Varietals name (default `Varietals`) |
| `FRAMER_VINTAGE_COLLECTION` | no | Override Vintage name (default `Vintage`) |
| `FRAMER_REGION_COLLECTION` | no | Override Region name (default `Region`) |
| `FRAMER_PRODUCTS_COLLECTION` | no | Override Products name (default `Products`) |

Real catalog (non-demo) also needs the `PLATFORM_*` WithWine vars — see
[../../DEPLOY.md](../../DEPLOY.md).

Add these in the Vercel project (and `.env.local` for local dev). Never commit the key.

## Manual sync (default)

```bash
curl -X POST "https://template-withwine.vercel.app/api/sync/run" \
  -H "Authorization: Bearer $SYNC_KEY"
# -> { "ok": true, "trigger": "manual", "result": { wineTypes, varietals, products } }
```

## Scheduled sync (enable when ready)

1. Set the interval in [vercel.json](../../vercel.json) → `crons[].schedule` (cron syntax).
   - **Vercel Hobby** allows only **once-daily** crons; **Pro** allows down to per-minute.
2. Set `SYNC_SCHEDULE_ENABLED=true` to turn it on (unset/`false` to pause — manual still works).
3. Redeploy.

## Notes

- The collections here should be **dedicated to this sync** — don't also manage
  them with another sync tool, or writes will conflict.
- References resolve **by slug**: Wine Types items have slug = `slugify(name)`
  (e.g. `red`), and each product's Wine Type reference value is `slugify(wineType)`.
- Items are upserted by slug and stale ones are pruned, so the collections mirror
  the catalog.
- `maxDuration` is set to 300s on both routes; the effective cap depends on your
  Vercel plan. The Server API is in open beta.
