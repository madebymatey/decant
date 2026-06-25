# Deploying the WithWine middleware to Vercel

This app is a pnpm + Turborepo workspace member, so the build must compile the
`@decant/*` packages before `next build`. `vercel.json` already handles that.

## 1. Create the Vercel project
- Import the repo in Vercel → **New Project**.
- **Root Directory:** `apps/template-withwine`  ← important (monorepo).
- Framework: **Next.js** (auto-detected). Install/Build commands come from
  `vercel.json` (they `cd` to the repo root and run the Turbo build) — leave the
  UI overrides off.

## 2. Environment variables  ← where the credentials go
Set these in **Vercel → Project → Settings → Environment Variables** (Production
+ Preview). They are NOT committed. For local dev the same values live in
`apps/template-withwine/.env.local` (gitignored — already scaffolded).

| Variable | Value | Status |
| --- | --- | --- |
| `TOKEN_SECRET` | random 32-byte hex (generate with `openssl rand -hex 32`) | set now |
| `ALLOWED_ORIGINS` | your Framer published domain(s), CSV (e.g. `https://www.yourwinery.com`) | set when you have the domain |
| `ALLOW_FRAMER_EDITOR_ORIGINS` | `true` while designing; `false` in prod | set now |
| `PLATFORM_API_URL` | `https://stage.withwine.com` (staging) / `https://secure.withwine.com` (prod) | set now |
| `PLATFORM_ASSET_URL` | `https://stage-s3-cdn.withwine.com` (staging) | set now |
| `PLATFORM_CURRENCY` | `AUD` | set now |
| `PLATFORM_LOCALE` | `en-AU` | set now |
| `FEED_KEY` | random hex (optional; protects `/api/feed/products`) | set now |
| **`PLATFORM_STORE_ID`** | **WithWine WineryBrandId** | ⏳ **pending — from WithWine** |
| **`PLATFORM_API_KEY`** | **WithWine clientId token** (the value after `clientid `) | ⏳ **pending — from WithWine** |

> The two **pending** vars are the only blockers. Everything else can be set now;
> the app boots without them (with demo defaults) but won't return real products
> until they're filled. `PLATFORM_API_KEY` is a secret — server-side only, never
> exposed to the browser.

## 3. Deploy + verify
- `GET /api/health` → `{ "status": "ok", "platform": "withwine" }` (no auth).
- `GET /api/feed/products` → until the WithWine creds are set, expect an upstream
  auth error envelope; once set, a JSON array of products.
- `GET /api/products` is origin + token gated (call `POST /api/token` first); it's
  meant for the Framer runtime client, not a plain browser hit.

## 4. After the credential arrives
1. Set `PLATFORM_STORE_ID` + `PLATFORM_API_KEY` in Vercel → redeploy.
2. Confirm `GET /api/feed/products` returns products.
3. Point FramerSync's API source at `https://<deploy>/api/feed/products` (+ `?key=`
   if `FEED_KEY` is set). See [../../framer/CMS-SYNC.md](../../framer/CMS-SYNC.md).
