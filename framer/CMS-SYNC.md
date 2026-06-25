# CMS sync (FramerSync → Framer CMS)

Keep a Framer CMS collection in sync with WithWine using an off-the-shelf sync
plugin ([FramerSync](https://sync.framer.parts/)) pointed at our middleware's
**JSON feed**. You then design the collection template visually in Framer.

We don't build or run a plugin — the plugin handles fetching, field mapping,
scheduling, and writing to the CMS. We only expose the feed.

## The feed endpoint

```
GET https://<your-middleware>.vercel.app/api/feed/products
```

- Returns a **flat JSON array** of products — every key always present, values are
  primitives or string arrays (ideal for field mapping).
- Not origin/token gated (sync tools fetch server-side). Optionally protect it:
  set `FEED_KEY` and pass `?key=<FEED_KEY>` or `Authorization: Bearer <FEED_KEY>`.
- Public catalog data only (same products as the storefront); the WithWine
  credential stays server-side.

Each item:

```json
{
  "id": "831",
  "slug": "estate-cabernet-sauvignon",
  "name": "Estate Cabernet Sauvignon",
  "description": "...",
  "price": 65,
  "priceLabel": "$65.00",
  "compareAtPrice": null,
  "compareAtLabel": "",
  "currency": "AUD",
  "image": "https://stage-s3-cdn.withwine.com/Product/....jpg",
  "images": ["https://.../1.jpg", "https://.../2.jpg"],
  "category": "",
  "available": true,
  "vintage": 2021,
  "varietal": "",
  "region": "Napa Valley",
  "appellation": "",
  "countryCode": "",
  "sku": ""
}
```

## Setup in FramerSync

1. Deploy the middleware and set its env (incl. the WithWine credential, and
   `FEED_KEY` if you want the feed protected).
2. In FramerSync, add an **API** source with the URL above (append `?key=...` or
   add the `Authorization` header if you set `FEED_KEY`).
3. Map fields → CMS fields, e.g.:

   | Feed field   | CMS field type |
   | ------------ | -------------- |
   | `name`       | Text (title)   |
   | `slug`       | Slug           |
   | `image`      | Image          |
   | `price`      | Number         |
   | `priceLabel` | Text           |
   | `category`   | Text           |
   | `vintage`    | Number         |
   | `region`     | Text           |
   | `available`  | Boolean        |
   | `description`| Formatted text |

4. Set the **unique identifier** to `id` so re-syncs update (upsert) instead of
   duplicating.
5. Choose a sync schedule (interval / on publish).
6. Design the collection list + template pages in Framer against those fields.

## Live data (stock / cart)

The CMS is a periodic snapshot. For data that must be current (real-time stock,
price, add-to-cart), keep using the runtime client in [`./README.md`](./README.md)
— CMS for the designable catalog + SEO, runtime fetch for live bits.

## Pending data (founder asks)

`category`, `varietal`, `appellation`, `countryCode` come through empty until
WithWine confirms the collections/ranges endpoint and where richer wine
attributes live. Cards/templates can bind them now; they'll populate once mapped.
