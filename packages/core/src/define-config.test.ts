import { describe, expect, it } from "vitest"
import { defineConfig } from "./define-config"

describe("defineConfig", () => {
  it("parses valid config", () => {
    const c = defineConfig({
      platform: "commerce7",
      storeId: "store-1",
      apiKey: "key",
    })
    expect(c.platform).toBe("commerce7")
    expect(c.currency).toBe("USD")
  })

  it("throws on invalid config", () => {
    expect(() =>
      defineConfig({
        platform: "commerce7",
        storeId: "",
        apiKey: "k",
      })
    ).toThrow(/Invalid platform config/)
  })
})
