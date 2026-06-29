# Per-project deployments — migration design

Status: **proposed** (plan only — no code yet). Decided 2026-06-29.

Goal: split Decant into a **control plane** (`decant.matey.co`) and a **data plane
per client** (e.g. `withwine-dev.vercel.app`). Each project gets its own Vercel
deployment that owns its feeds, runtime, credentials, and sync execution. The
dashboard provisions and orchestrates; it no longer serves customer data.

Decisions locked with the user:
- Sync **runs on the per-project deploy**; decant **triggers** it remotely.
- Feeds **move onto the per-project deploy** (off `decant.matey.co`).
- Build scope for now: **design only**, then ship in phases (minimal first).

---

## 1. Target architecture

```
 decant.matey.co  (CONTROL PLANE)            withwine-dev.vercel.app  (DATA PLANE / per project)
 ────────────────────────────────           ───────────────────────────────────────────────────
 • Dashboard UI + Google SSO                 = a deploy of apps/template-withwine, env-configured
 • Project config + creds (encrypted)        • GET /api/feed/*        ← Framer CMS sync source
 • Provisions Vercel projects (API)          • GET /api/products, POST /api/token, /api/checkout
 • Triggers syncs ───────────────────────▶   • POST /api/sync/run     ← decant calls this
 • Stores sync history + status  ◀────────    • runs the Framer push (framer-api) with ITS creds
 • Feeds tab = proxy preview of the deploy    • optional self-cron, or decant-driven schedule
 • Holds a scoped VERCEL_API_TOKEN            • owns PLATFORM_* + FRAMER_* + SYNC_KEY + FEED_KEY
```

Framer side: the DecantConfig `baseUrl` **and** the CMS feed URL both point at the
**per-project** deploy (`https://withwine-dev.vercel.app`). `decant.matey.co` is
never referenced by Framer.

The per-project app already exists: it's `apps/template-withwine`
(`/api/feed/*`, `/api/products`, `/api/token`, `/api/checkout`, `/api/sync/run`,
`/api/cron/sync`, `lib/framer-sync/engine.ts`). One codebase → many Vercel
projects, each with distinct env. We do **not** create a repo per client.

---

## 2. What moves, what stays

### decant (`apps/dashboard`)
| Today | Target |
|---|---|
| `src/lib/sync/engine.ts` runs framer-api push locally | **Removed.** Replaced by a remote trigger (`POST <deploy>/api/sync/run`). decant drops its `framer-api` dependency. |
| `src/lib/sync/run.ts` `executeSync()` does the work | Rewritten to call the deploy, parse the result, and still write a `sync_run` row (history stays in decant). |
| `/{slug}/api/feed/[kind]` + `/api/projects/[id]/feed/[kind]` + `src/lib/feeds.ts` build feeds | **Removed.** Feeds tab preview becomes a server-side **proxy** to `<deploy>/api/feed/<kind>?key=<feedKey>`. |
| `/api/cron/tick` runs syncs locally | Loops due projects and **POSTs to each deploy's** `/api/sync/run`. Scheduling stays centralized in decant (so the Schedule UI keeps meaning). |
| Secrets used to serve data | Secrets are **collected** in decant (UX) and **pushed to the deploy's env** at provision time; kept encrypted for re-provisioning. decant no longer reads catalogs itself. |
| — | **New:** Vercel provisioning module + `VERCEL_API_TOKEN`. New `project` columns: `deployUrl`, `vercelProjectId`, `deployStatus`, `lastDeployedAt`; new secret `syncKey`. |

### storefront template (`apps/template-withwine`)
- `/api/sync/run` ([pages/api/sync/run.ts](../apps/template-withwine/pages/api/sync/run.ts)) gains an **optional JSON body** for collection mappings + field-type overrides, so the dashboard's per-project config drives the remote sync. Today it calls `syncToFramer()` with no args.
- `lib/framer-sync/engine.ts` gains **field-type override** support (single vs multi `collectionReference`). Collection *names* are already env-configurable (`FRAMER_WINETYPES_COLLECTION`, etc.); the cardinality override exists only in the dashboard engine today and must be ported here.
- No other changes — it already serves feeds + runtime and is SYNC_KEY / FEED_KEY gated.

---

## 3. Sync trigger contract (decant → deploy)

```
POST https://<deploy>/api/sync/run
Authorization: Bearer <SYNC_KEY>
Content-Type: application/json

{ "mappings": [ { "source": "products", "framerCollectionName": "Products",
                  "fieldOverrides": [ { "field": "Varietal",
                                        "type": "multiCollectionReference",
                                        "enabled": true } ] } ] }

→ 200 { "ok": true, "result": { "added": 0, "updated": 74, "deleted": 0 } }
```

decant writes the result into its `sync_run` table (status/counts/duration/error),
so the Activity feed + "last synced" keep working with the execution remote.

Scheduling: decant's daily tick (`0 6 * * *`) selects due projects and fires the
POST above for each. The per-project deploy needs no cron of its own.

---

## 4. Provisioning (Vercel API) — for the full-auto phase

decant holds a **team-scoped `VERCEL_API_TOKEN`**. On "Create project" (or a
"Deploy" button), in order:

1. `POST /v11/projects` — name `<slug>`, framework `nextjs`,
   `gitRepository` = `madebymatey/decant`, `rootDirectory` = `apps/template-withwine`.
   (Many Vercel projects from one repo, each with its own env — supported.)
2. `POST /v10/projects/{id}/env` (target `production`) for each var:
   `PLATFORM_API_KEY`, `PLATFORM_STORE_ID`, `PLATFORM_API_URL`, `PLATFORM_ASSET_URL`,
   `PLATFORM_CURRENCY`, `PLATFORM_LOCALE`, `FRAMER_API_KEY`, `FRAMER_PROJECT_URL`,
   `FRAMER_*_COLLECTION`, `SYNC_KEY`, `FEED_KEY`, `TOKEN_SECRET`, `ALLOWED_ORIGINS`,
   `ALLOW_FRAMER_EDITOR_ORIGINS`.
3. Trigger a deploy (Deploy Hook, or `POST /v13/deployments` on the git ref).
4. Poll deployment status → store `deployUrl` (`<slug>.vercel.app`) + `vercelProjectId`.
5. Optional `POST /v10/projects/{id}/domains` for a custom domain.

Security: `VERCEL_API_TOKEN` can create/delete projects — high privilege. Keep it
**only** in decant's env, prefer a dedicated token, and consider read-back/least
scope. This is the main new risk introduced by full automation.

---

## 5. Data-model changes (decant)

`project`: add `deployUrl text`, `vercelProjectId text`, `deployStatus text`
(`none|provisioning|ready|error`), `lastDeployedAt timestamp`.
`project_secret`: add a `syncKey` entry (Bearer for the trigger). Existing
`platformApiKey` / `framerApiKey` / `feedKey` stay — now used to **push to the
deploy env**, **proxy feed previews**, and **trigger syncs**, not to serve data.
Optional `deployment` table for deploy history.

---

## 6. Migrating the existing `withwine-dev`

The current `template-withwine.vercel.app` already runs with greenway-staging
creds — effectively the withwine-dev data plane already exists. Migration:

1. Decide: rename/keep `template-withwine` as the withwine-dev deploy, **or** create
   a fresh `withwine-dev` Vercel project from the same template + env.
2. Set that deploy's env from decant's stored config/secrets; set `SYNC_KEY`.
3. In decant: record `deployUrl` + `syncKey` on the withwine-dev project.
4. Switch decant's sync to the remote trigger; run one sync; verify it writes to
   Framer from the deploy.
5. Point Framer DecantConfig `baseUrl` → the deploy URL.
6. Retire decant's central engine/feed paths for this project.

---

## 7. Phasing

- **Phase 0 — now:** this design.
- **Phase 1 — minimal "register + orchestrate":** add `deployUrl` + `syncKey`;
  remote-trigger sync; proxy feed previews; extend template `/api/sync/run` to
  accept mappings + port field-overrides into the template engine. You create the
  Vercel deploy once, by hand, and paste its URL into decant. Ships fast, low risk.
- **Phase 2 — full auto-provision:** Vercel-API module + "Deploy" button + env push
  + status polling + optional domain. Adds `VERCEL_API_TOKEN`.
- **Phase 3 — cleanup:** delete decant's central `engine.ts` / `feeds.ts` /
  `/{slug}/api/feed` / `/api/projects/[id]/feed`; trim now-unused code.

Phase 1 alone delivers the separation-of-concerns goal; Phase 2 delivers the
"never touch Vercel" goal.

---

## 8. Open decisions (need your call before Phase 1/2)

1. **withwine-dev:** reuse the existing `template-withwine` deploy, or stand up a
   fresh `withwine-dev` project? (Reuse is faster; fresh is cleaner naming.)
2. **Custom domains:** is `<slug>.vercel.app` enough for now, or do you want real
   domains (e.g. `api.<client>.com`) per project? (Affects Phase 2 domain step.)
3. **Keep creds in decant after provisioning?** Recommended yes (encrypted), so a
   config change can re-push env without re-entry. Confirm you're OK with decant
   retaining them at rest even though it no longer serves data.
4. **Vercel token:** OK to store a team-scoped `VERCEL_API_TOKEN` in decant for
   Phase 2? (It can create/delete projects.)
5. **Mappings delivery:** via the `/api/sync/run` POST body (recommended) vs baked
   into the deploy's env at provision time. Body keeps it editable in the UI live.
```
