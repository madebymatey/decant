import type { Product } from "@decant/core"
import { ErrorCode, PlatformError } from "@decant/core"
import { adapter } from "./adapter"
import { demoProducts } from "./demo-products"

/**
 * Demo mode serves the sample catalog instead of calling WithWine. It's on when
 * DEMO_MODE=1, or automatically whenever no real WithWine credential is set
 * (PLATFORM_API_KEY unset) — so a bare deploy is testable out of the box.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1" || !process.env.PLATFORM_API_KEY
}

export async function getCatalogProducts(): Promise<Product[]> {
  return isDemoMode() ? demoProducts : adapter.getProducts()
}

export async function getCatalogProduct(id: string): Promise<Product> {
  if (!isDemoMode()) {
    return adapter.getProduct(id)
  }
  const product = demoProducts.find((p) => p.id === id)
  if (!product) {
    throw new PlatformError(ErrorCode.NOT_FOUND, `Product ${id} not found`, "withwine", 404)
  }
  return product
}
