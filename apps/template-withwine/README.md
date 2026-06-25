# template-withwine

The canonical **per-client WithWine storefront middleware**. It's a Next.js
(Pages Router) app that:

1. Reads catalog data from WithWine via `@decant/adapter-withwine`.
2. Transforms it to a Framer-ready shape via `@decant/framer`.
3. Serves it over origin- and token-protected JSON routes a Framer code
   component consumes at runtime.

Next.js (not bare functions) because WithWine's customer-auth SDK requires a full
Next.js server — so adding login/club/orders later is drop-in (see
`pages/api/withwine/README.md`).

## Using this for a new client

Per-client deployments live in their **own thin repos** that install the
published `@decant/*` packages. To spin one up:

1. Copy this folder into the client repo (or use it as a template repo).
2. Replace the `workspace:*` versions with published versions, e.g.
   `"@decant/adapter-withwine": "^0.1.0"`.
3. Set env vars from `.env.example` in the client's Vercel project.
4. Deploy to Vercel (auto-detected as a Next.js app).

## Endpoints

| Method | Path                 | Auth                     | Returns                       |
| ------ | -------------------- | ------------------------ | ----------------------------- |
| POST   | `/api/token`         | Allowed origin           | `{ token, expiresIn }`        |
| GET    | `/api/products`      | Origin + bearer token    | `{ items: FramerProduct[] }`  |
| GET    | `/api/products/:id`  | Origin + bearer token    | `{ product: FramerProduct }`  |
| GET    | `/api/collections`   | Origin + bearer token    | `{ items: [] }` (TODO)        |
| GET    | `/api/health`        | none                     | `{ status: "ok" }`            |

## Framer client contract

```ts
// In a Framer code component (origin must be in ALLOWED_ORIGINS):
const base = "https://your-middleware.vercel.app"
const { token } = await fetch(`${base}/api/token`, { method: "POST" }).then((r) => r.json())
const { items } = await fetch(`${base}/api/products`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
```

## Local dev

```bash
cp .env.example .env.local   # fill in TOKEN_SECRET + PLATFORM_* values
pnpm -C apps/template-withwine dev
```
