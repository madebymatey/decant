import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { defineConfig } from "@decant/core"
import { WithWineAdapter } from "./withwine-adapter"

// Shaped after a real populated example from the WithWine backend collection
// (GET /api/wine/Products -> { ..., data: [ <product> ] }).
const sampleProduct = {
  id: 831,
  brandId: 81,
  name: "Another product",
  displayName: "Estate Cabernet Sauvignon",
  description: "Flagship red",
  coverPhotoPath: "Product/cab.jpg",
  isSaleable: true,
  fullPrice: 80,
  singlePrice: 65,
  bottlePrice: 65,
  region: "Napa Valley",
  vintage: "2021",
  wineType: 1,
  productType: "Wine",
  brand: { name: "Estate", paymentCurrency: "USD" },
}

const config = () =>
  defineConfig({
    platform: "withwine",
    storeId: "81",
    apiKey: "secret",
    currency: "AUD",
    assetBaseUrl: "https://cdn.withwine.com",
  })

describe("WithWineAdapter", () => {
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
                currentPage: 1,
                pageCount: 1,
                pageSize: 1000,
                totalCount: 1,
                data: [sampleProduct],
              })
            ),
        } as Response)
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects a config whose platform is not 'withwine'", () => {
    expect(
      () =>
        new WithWineAdapter(
          defineConfig({
            platform: "orderport",
            storeId: "81",
            apiKey: "secret",
          })
        )
    ).toThrow()
  })

  it("maps WithWine product fields to core Product (incl. wine attrs)", async () => {
    const products = await new WithWineAdapter(config()).getProducts()
    expect(products).toHaveLength(1)
    const p = products[0]
    expect(p?.id).toBe("831")
    expect(p?.title).toBe("Estate Cabernet Sauvignon") // displayName preferred
    expect(p?.price).toBe(65) // singlePrice
    expect(p?.compareAtPrice).toBe(80) // fullPrice > price
    expect(p?.available).toBe(true) // isSaleable
    expect(p?.currency).toBe("USD") // brand.paymentCurrency overrides fallback
    expect(p?.images?.[0]).toBe("https://cdn.withwine.com/Product/cab.jpg")
    expect(p?.wine?.vintage).toBe(2021) // string -> number
    expect(p?.wine?.region).toBe("Napa Valley")
  })

  it("calls /api/wine/Products with clientid auth + brand id", async () => {
    await new WithWineAdapter(config()).getProducts()

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toContain("https://secure.withwine.com/api/wine/Products")
    expect(url).toContain("id=81")
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe("clientid secret")
  })
})
