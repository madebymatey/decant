import { describe, it, expect } from "vitest"
import type { Product } from "@decant/core"
import {
  toFramerProduct,
  pickFields,
  parseFieldsParam,
} from "./serializer"

describe("toFramerProduct", () => {
  it("formats price labels and flattens wine attributes", () => {
    const product: Product = {
      id: "w1",
      title: "Estate Cabernet Sauvignon",
      price: 65,
      compareAtPrice: 80,
      currency: "USD",
      images: ["https://cdn.example.com/cab.jpg"],
      collections: [{ id: "c1", title: "Reds" }],
      wine: {
        vintage: 2021,
        varietal: "Cabernet Sauvignon",
        region: "Napa Valley",
      },
    }

    const fp = toFramerProduct(product, { locale: "en-US" })

    expect(fp.priceLabel).toBe("$65.00")
    expect(fp.compareAtLabel).toBe("$80.00")
    expect(fp.image).toBe("https://cdn.example.com/cab.jpg")
    expect(fp.category).toBe("Reds")
    expect(fp.vintage).toBe(2021)
    expect(fp.region).toBe("Napa Valley")
    expect(fp.available).toBe(true)
  })

  it("defaults missing optional fields safely", () => {
    const product: Product = {
      id: "x",
      title: "Mystery Bottle",
      price: null,
      currency: "USD",
    }

    const fp = toFramerProduct(product)

    expect(fp.priceLabel).toBeNull()
    expect(fp.images).toEqual([])
    expect(fp.collections).toEqual([])
    expect(fp.category).toBeNull()
    expect(fp.vintage).toBeNull()
  })
})

describe("field selection", () => {
  const product: Product = {
    id: "w1",
    title: "Estate Cabernet",
    price: 65,
    currency: "USD",
    images: ["https://cdn.example.com/cab.jpg"],
  }

  it("parseFieldsParam keeps known fields and drops unknown ones", () => {
    expect(parseFieldsParam("image,title,price,bogus")).toEqual([
      "image",
      "title",
      "price",
    ])
    expect(parseFieldsParam(undefined)).toBeNull()
    expect(parseFieldsParam("nonsense")).toBeNull()
  })

  it("pickFields returns only requested fields, always including id", () => {
    const fp = toFramerProduct(product)
    const picked = pickFields(fp, ["title", "price"])
    expect(Object.keys(picked).sort()).toEqual(["id", "price", "title"])
    expect(picked.title).toBe("Estate Cabernet")
    expect(picked.id).toBe("w1")
  })
})
