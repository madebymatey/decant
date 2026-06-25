import { describe, it, expect } from "vitest"
import type { FramerProduct } from "./serializer"
import { toCmsRecord, toCmsRecords, slugify } from "./cms"

const fp = (over: Partial<FramerProduct>): FramerProduct => ({
  id: "1",
  title: "Wine",
  images: [],
  price: null,
  priceLabel: null,
  compareAtPrice: null,
  compareAtLabel: null,
  currency: "AUD",
  available: true,
  collections: [],
  category: null,
  vintage: null,
  varietal: null,
  wineType: null,
  region: null,
  appellation: null,
  countryCode: null,
  ...over,
})

describe("slugify", () => {
  it("produces url-safe slugs and strips diacritics", () => {
    expect(slugify("Château Margaux 2018!")).toBe("chateau-margaux-2018")
  })
})

describe("toCmsRecord", () => {
  it("flattens to a complete record with no undefined values", () => {
    const rec = toCmsRecord(
      fp({
        id: "831",
        title: "Estate Cabernet",
        price: 65,
        priceLabel: "$65.00",
        images: ["https://cdn/x.jpg", "https://cdn/y.jpg"],
        region: "Napa Valley",
        vintage: 2021,
      })
    )
    expect(rec.slug).toBe("estate-cabernet")
    expect(rec.name).toBe("Estate Cabernet")
    expect(rec.price).toBe(65)
    expect(rec.image).toBe("https://cdn/x.jpg")
    expect(rec.region).toBe("Napa Valley")
    expect(rec.varietal).toBe("") // present, never undefined
    expect(Object.values(rec).every((v) => v !== undefined)).toBe(true)
  })
})

describe("toCmsRecords", () => {
  it("guarantees unique slugs on collision", () => {
    const recs = toCmsRecords([
      fp({ id: "1", title: "Shiraz" }),
      fp({ id: "2", title: "Shiraz" }),
    ])
    expect(recs[0]?.slug).toBe("shiraz")
    expect(recs[1]?.slug).toBe("shiraz-2")
  })
})
