import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { defineConfig } from "@decant/core"
import { Commerce7Adapter } from "./commerce7-adapter"

describe("Commerce7Adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                products: [
                  {
                    id: "1",
                    title: "Bottle",
                    variants: [{ price: 2500 }],
                  },
                ],
                cursor: null,
              })
            ),
        } as Response)
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("getProducts maps Commerce7 payloads to core Product", async () => {
    const adapter = new Commerce7Adapter(
      defineConfig({
        platform: "commerce7",
        storeId: "tenant",
        apiKey: "app:secret",
        apiUrl: "https://c7.example.com",
        currency: "USD",
      })
    )
    const products = await adapter.getProducts()
    expect(products).toHaveLength(1)
    expect(products[0]?.id).toBe("1")
    expect(products[0]?.price).toBe(25)
  })

  it("maps the standardized wine block, compareAtPrice and availability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                products: [
                  {
                    id: "2",
                    title: "Estate Cabernet",
                    slug: "estate-cab",
                    webStatus: "Available",
                    variants: [{ price: 6500, comparePrice: 8000 }],
                    wine: {
                      type: "Red",
                      varietal: "Cabernet Sauvignon",
                      vintage: 2019,
                      region: "Napa Valley",
                      appellation: "Oakville",
                      countryCode: "US",
                    },
                  },
                ],
                cursor: null,
              })
            ),
        } as Response)
      )
    )
    const adapter = new Commerce7Adapter(
      defineConfig({
        platform: "commerce7",
        storeId: "tenant",
        apiKey: "app:secret",
        apiUrl: "https://c7.example.com",
        currency: "USD",
      })
    )
    const [product] = await adapter.getProducts()
    expect(product?.wine).toEqual({
      type: "Red",
      varietal: "Cabernet Sauvignon",
      vintage: 2019,
      region: "Napa Valley",
      appellation: "Oakville",
      countryCode: "US",
    })
    expect(product?.price).toBe(65)
    expect(product?.compareAtPrice).toBe(80)
    expect(product?.available).toBe(true)
    expect(product?.slug).toBe("estate-cab")
  })

  it("createCheckout builds an addToCart handoff to the storefront", async () => {
    const adapter = new Commerce7Adapter(
      defineConfig({
        platform: "commerce7",
        storeId: "tenant",
        apiKey: "app:secret",
        apiUrl: "https://c7.example.com",
        storefrontUrl: "https://shop.winery.com",
        currency: "USD",
      })
    )
    const { url } = await adapter.createCheckout!({
      items: [
        { id: "p1", sku: "CAB750", quantity: 2 },
        { id: "p2", sku: "CHARD750", quantity: 1 },
      ],
    })
    expect(url).toContain("https://shop.winery.com/?")
    expect(url).toContain("addToCart=CAB750")
    expect(url).toContain("quantity=2")
    expect(url).toContain("addToCart=CHARD750")
    expect(url).toContain("checkout=true")
  })

  it("createCheckout requires a storefront URL", async () => {
    const adapter = new Commerce7Adapter(
      defineConfig({
        platform: "commerce7",
        storeId: "tenant",
        apiKey: "app:secret",
        apiUrl: "https://c7.example.com",
        currency: "USD",
      })
    )
    await expect(
      adapter.createCheckout!({ items: [{ id: "p1", sku: "X", quantity: 1 }] })
    ).rejects.toThrow(/storefront URL/)
  })
})
