# Server-synced cart (WithWine cart API) — plan

Status: **proposed** (plan only). Addresses CTO feedback (2026-06-29):

> Local cart works, but long-term it should sync via the WithWine cart-item API
> so abandoned carts can be tracked server-side. For anonymous users, use a string
> "session key" to identify the cart, then pass it in the checkout URL so checkout
> marks the cart completed.

This is **runtime/storefront** work — it lives in `apps/template-withwine`
(middleware proxy), `framer/` (code components), and `@decant/adapter-withwine` +
`@decant/core`. The **decant dashboard is not involved** (control plane only).

## Today

- [framer/decant.ts](../framer/decant.ts) `// cart (localStorage)` — `addToCart` /
  `setQuantity` / `removeFromCart` / `useCart` are **localStorage-only**; the cart
  never touches a server.
- [checkout.ts](../apps/template-withwine/pages/api/checkout.ts) builds
  `{apiBase}/WithWineOrder/Checkout/?productIds=<csv>&quantities=<csv>` — URL-driven,
  **no session key**, so WithWine can't associate/complete a tracked cart.
- [withwine-adapter.ts](../packages/adapter-withwine/src/withwine-adapter.ts)
  `getCart`/`updateCart`/`createOrder` target **guessed** paths
  (`/api/cart/carts/{id}`, `/api/order/orders`) that don't exist — to be reworked.

## Target

The cart becomes **server-owned (WithWine)**, keyed by an anonymous **session key**
the Framer client generates and holds. WithWine then sees create/update activity
and can track abandonment; the session key in the checkout URL lets WithWine mark
the cart completed on order.

```
Framer (decant.ts)            template-withwine (proxy)          WithWine
─────────────────             ─────────────────────────         ─────────────────
holds sessionKey (UUID)  ──▶  /api/cart/* (token-gated)   ──▶   /api/cart/* with
in localStorage               injects clientId server-side       Authorization: clientid
optimistic UI + cache    ◀──  normalised cart lines        ◀──  cart state
checkout(): redirect ──────────────────────────────────────▶   /WithWineOrder/Checkout
  ?productIds&quantities&sessionKey=<sid>                        marks cart completed
```

### Session key
- Framer generates a UUID on first cart action, persists as `decant:sessionKey`
  (mirrors WithWine's own `WithWine_Data_State`). Not a secret — just an id.
- Sent on every cart call **and** appended to the checkout URL as `sessionKey=`.
- Designed so a future logged-in flow can `merge` the anon cart into a member cart.

### WithWine cart API — VERIFIED LIVE 2026-06-29 (greenway staging, Phase A ✓).
Base `https://stage.withwine.com`, auth `clientid <clientId>` (anon). Findings
recorded in [[withwine-integration]]. Highlights: cart is genuinely server-synced
and persistent under the session id; `cart/update` `Quantity:0` removes; `order/price`
needs explicit `Items` (not the session cart) and enforces business rules (e.g.
**"Orders must be shippable in boxes of 6"** → pack UX must respect this); the
checkout shell accepts `sessionKey` (200). Endpoints:
- `GET  /api/cart?BrandId=<id>&UnauthenticatedSessionId=<sid>` → `[{id, product, quantity, options}]`
- `POST /api/cart/update` `{UnauthenticatedSessionId, BrandId, IncludeCart:true, Items:[{ProductId, Quantity, Options:[{productId,name,quantity,forItemQuantityIndex}]}]}`
- `POST /api/cart/merge` `{UnauthenticatedSessionId, BrandId}` (anon→member on login)
- `POST /api/cart/complete` `{UnauthenticatedSessionId, BrandId, OrderId}` (clear after order)
- `POST /api/order/price` (+ `/api/order/price/options`) — live totals/tax/shipping/coupons
- `GET  /api/site/urlconfig?BrandId=<id>` → hosted-store + checkoutRedirectPath config

### Middleware proxy (on the per-project storefront deploy)
New **token-gated** routes under `apps/template-withwine/pages/api/cart/` that mirror
the above but inject `clientId` server-side (so the credential never reaches the
browser) and reuse the existing origin allowlist + Bearer-token gate (`protectApi`):
- `GET  /api/cart?sessionKey=<sid>` → proxy `GET /api/cart?BrandId&UnauthenticatedSessionId`
- `POST /api/cart/update` `{sessionKey, items:[{productId, quantity, options?}]}`
- `POST /api/cart/price`  `{sessionKey, items}` → totals
- `POST /api/cart/complete` `{sessionKey, orderId}`
Responses normalised to core `Cart`/`CartItem`.

### Adapter (`@decant/adapter-withwine`)
Replace the guessed stubs with real methods against the confirmed endpoints:
`getCart(sessionKey)`, `updateCart(sessionKey, items)`, `priceCart(sessionKey, items)`,
`completeCart(sessionKey, orderId)`. Map WithWine cart JSON ↔ core `Cart`. Carry the
**pack/option** model (bottle / half-dozen / dozen) on each line — WithWine prices
per pack, so a line is `{productId, quantity, option}` not just `{productId, qty}`.

### Framer components (`framer/decant.ts` + cart UI)
- `useCart()` becomes server-backed: load/create `sessionKey`, `GET /api/cart`, and
  on each mutation `POST /api/cart/update`, updating state from the response.
- Keep **optimistic updates + a localStorage cache** so the UI stays instant and
  degrades gracefully if the cart API blips — but the server is source of truth.
- Cart UI gains **pack/option selection** (AddToCart + line items) to satisfy the
  per-pack model.
- `checkout()` appends `&sessionKey=<sid>` to the handoff URL (one-line change in
  [checkout.ts](../apps/template-withwine/pages/api/checkout.ts) once the param is
  confirmed). On return to `/CheckoutSuccess?oid=`, optionally `POST /api/cart/complete`
  + clear the local cache.

## Phasing

- **Phase A — verify the contract (do first; de-risks everything).** On greenway
  staging: load the WithWine widget, watch the network on add-to-cart / checkout,
  and confirm the exact `/api/cart/*` request+response shapes, the `Options` pack
  model, and that `sessionKey=` in the checkout URL actually marks the cart
  completed. Record findings in [[withwine-integration]].
- **Phase B — adapter + core. ✓ DONE.** `@decant/core` cart types extended
  (`CartItem` rich fields, `CartLineOption`, `CartTotals`); `WithWineAdapter` has
  real `getCart`/`updateCart`/`priceCart`/`completeCart` against the verified API.
  Smoke-tested live (qty 6 → AUD 360, free shipping, no errors).
- **Phase C — middleware proxy. ✓ DONE.** Token+origin-gated
  `apps/template-withwine/pages/api/cart/{index,update,price,complete}.ts` keep the
  clientId server-side; demo mode returns a client-only cart.
- **Phase D — Framer cart.** Server-backed `useCart` + sessionKey + optimistic UI +
  pack/option selection.
- **Phase E — checkout completion.** `sessionKey` in the checkout URL +
  `/api/cart/complete` on success.
- **Phase F — members (later).** Login + `/api/cart/merge` (anon→member).

## Open questions
1. ~~Verify the `/api/cart/*` shapes against live WithWine.~~ **DONE (Phase A ✓).**
   Remaining sub-item needing a **real test order** (couldn't do without payment):
   does `sessionKey` in the checkout URL auto-complete the REST cart, or must we
   call `POST /api/cart/complete {…, OrderId}` on `CheckoutSuccess`? Plan for the
   latter (we control it) and treat auto-complete as a bonus if confirmed.
2. **Pack/option model** — `order/price` enforces "boxes of 6", and lines carry
   `halfDozenPrice`/`dozenPrice` + `minimumUnitPurchase`. The cart UX must let users
   pick/validate packs. Need a **multi-pack product** to confirm the `Options`
   payload shape (the test wine was single-only). This is the biggest UI change.
3. **Abandoned-cart reporting** — surfaced in the WithWine winery backend, or does
   the CTO want a webhook/report on our side? (Likely WithWine-side; confirm.)
4. **Migration** — seed the server cart from any existing localStorage cart on first
   load, then switch to server-as-truth.
5. **Totals** — client estimate vs an `/api/order/price` round-trip per change
   (latency vs accurate tax/shipping/coupons + the box-of-6 validation).
```
