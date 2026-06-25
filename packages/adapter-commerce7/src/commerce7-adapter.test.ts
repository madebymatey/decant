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
})
