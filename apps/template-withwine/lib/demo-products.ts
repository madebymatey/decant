import type { Product } from "@decant/core"

/**
 * Sample catalog used when no real WithWine credential is configured (demo mode).
 * Lets the full pipeline (adapter shape → serializer → CMS feed) and downstream
 * tools (FramerSync, Framer components) be tested before live creds arrive.
 *
 * Images use placehold.co, which returns the PNG DIRECTLY (no redirect) so Framer
 * CMS / FramerSync can import them. (picsum.photos 302-redirects and won't import.)
 */
export const demoProducts: Product[] = [
  {
    id: "demo-1",
    title: "Estate Cabernet Sauvignon",
    description: "Full-bodied with blackcurrant, cedar and a long, structured finish.",
    price: 65,
    compareAtPrice: 80,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/7b1e3b/ffffff.png"],
    sku: "EST-CAB-21",
    slug: "estate-cabernet-sauvignon",
    available: true,
    collections: [{ id: "red", title: "Red Wine" }],
    wine: { vintage: 2019, varietal: "Cabernet Sauvignon", type: "Red", region: "Barossa Valley", countryCode: "AU" },
  },
  {
    id: "demo-2",
    title: "Reserve Chardonnay",
    description: "Bright stone fruit, subtle oak and a creamy texture.",
    price: 42,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/efe7c8/333333.png"],
    sku: "RES-CHA-22",
    slug: "reserve-chardonnay",
    available: true,
    collections: [{ id: "white", title: "White Wine" }],
    wine: { vintage: 2018, varietal: "Chardonnay", type: "White", region: "Margaret River", countryCode: "AU" },
  },
  {
    id: "demo-3",
    title: "Old Vine Shiraz",
    description: "Concentrated dark fruit, pepper and velvety tannins from century-old vines.",
    price: 58,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/5e1322/ffffff.png"],
    sku: "OV-SHZ-20",
    slug: "old-vine-shiraz",
    available: true,
    collections: [{ id: "red", title: "Red Wine" }],
    wine: { vintage: 2017, varietal: "Shiraz", type: "Red", region: "McLaren Vale", countryCode: "AU" },
  },
  {
    id: "demo-4",
    title: "Provincial Rosé",
    description: "Pale, dry and crisp with red berry and citrus notes.",
    price: 28,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/f3c1bf/7b1e3b.png"],
    sku: "PRV-ROS-23",
    slug: "provincial-rose",
    available: true,
    collections: [{ id: "rose", title: "Rosé" }],
    wine: { vintage: 2024, varietal: "Grenache", type: "Rosé", region: "Yarra Valley", countryCode: "AU" },
  },
  {
    id: "demo-5",
    title: "Cuvée Brut Sparkling",
    description: "Fine bead, brioche and green apple. Traditional method.",
    price: 75,
    compareAtPrice: 90,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/d9c27a/333333.png"],
    sku: "CUV-BRT-NV",
    slug: "cuvee-brut-sparkling",
    available: false,
    collections: [{ id: "sparkling", title: "Sparkling" }],
    wine: { vintage: null, varietal: "Chardonnay / Pinot Noir", type: "Sparkling", region: "Tasmania", countryCode: "AU" },
  },
  {
    id: "demo-6",
    title: "Eden Valley Riesling",
    description: "Zesty lime and florals with racy acidity and a mineral finish.",
    price: 35,
    currency: "AUD",
    images: ["https://placehold.co/800x1000/e3ecc0/333333.png"],
    sku: "EV-RIE-22",
    slug: "eden-valley-riesling",
    available: true,
    collections: [{ id: "white", title: "White Wine" }],
    wine: { vintage: 2016, varietal: "Riesling", type: "White", region: "Eden Valley", countryCode: "AU" },
  },
]
