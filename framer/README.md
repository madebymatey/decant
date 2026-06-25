# Framer components

Client-side code components that pull products from the Decant → WithWine
middleware into Framer. They are **paste-into-Framer** source (they import
Framer's runtime), so they live here rather than in the repo build.

## Files

| File             | What it is                                                            |
| ---------------- | -------------------------------------------------------------------- |
| `decant.ts`      | Shared client: token handling, field-scoped fetch, local cart hooks. |
| `ProductCard.tsx`| Presentational card + Add to cart. Owns `PRODUCT_CARD_FIELDS`.       |
| `ProductGrid.tsx`| Canvas component: fetches the catalog and renders cards.            |
| `CartBadge.tsx`  | Live cart count + total.                                            |

## Setup in Framer

1. In Framer: **Assets → Code → New Code File**, one per file above (same names).
2. Open the deployed middleware in **ProductGrid → Middleware URL**
   (e.g. `https://your-middleware.vercel.app`). Components handle the token
   exchange automatically.
3. Drop **ProductGrid** on the canvas; add **CartBadge** wherever you want a cart
   indicator.

> The middleware must be deployed (https) and have a valid WithWine credential
> set. Framer runs in the browser, so it can't reach `localhost`.

## The selective-data pattern

Each component declares the fields it needs and requests **only those**. The card
owns its list:

```ts
// ProductCard.tsx
export const PRODUCT_CARD_FIELDS = ["id","title","image","images","price","priceLabel","category","available"]
```

```ts
// ProductGrid.tsx — asks the middleware for exactly the card's fields
const { products } = useProducts(baseUrl, PRODUCT_CARD_FIELDS)
// -> GET /api/products?fields=id,title,image,images,price,priceLabel,category,available
```

To build a richer component (e.g. a product detail view), define a different
field list and pass it to `useProducts` / `fetchProduct`. The middleware trims
server-side, so payloads stay small and the API surface stays a single endpoint.

Available fields: `id, title, description, slug, image, images, price,
priceLabel, compareAtPrice, compareAtLabel, currency, sku, available,
collections, category, vintage, varietal, wineType, region, appellation,
countryCode`.

## Cart (current limitation)

Add to cart uses a **local cart** (localStorage) so you can build and test the
full UX now. It is not yet synced to WithWine — that needs WithWine's headless
cart/checkout endpoints (a pending founder question). When those land, only
`addToCart`/`useCart` in `decant.ts` change; the components stay the same.

## Data notes (pending WithWine confirmation)

- `category` currently comes from the first collection; real categories need the
  collections/ranges endpoint (or the `wineType` enum). Cards render it only when
  present.
- `varietal`/`appellation`/`countryCode` depend on where WithWine exposes richer
  wine attributes (list object vs detail endpoint).
