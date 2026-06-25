import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { defineConfig } from "@decant/core"
import { OrderPortAdapter } from "./orderport-adapter"

describe("OrderPortAdapter", () => {
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
                items: [
                  {
                    id: "p1",
                    title: "Port Wine",
                    price: 42,
                    currency: "USD",
                  },
                ],
              })
            ),
        } as Response)
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("getProducts maps OrderPort payloads to core Product", async () => {
    const adapter = new OrderPortAdapter(
      defineConfig({
        platform: "orderport",
        storeId: "store",
        apiKey: "token",
        apiUrl: "https://op.example.com",
        currency: "USD",
      })
    )
    const products = await adapter.getProducts()
    expect(products).toHaveLength(1)
    expect(products[0]?.title).toBe("Port Wine")
    expect(products[0]?.price).toBe(42)
  })
})
