import type {
  Availability,
  Cart,
  CartTotals,
  CheckoutInput,
  CheckoutResult,
  Club,
  Config,
  Member,
  Order,
  PlatformAdapter,
  Product,
} from "@decant/core"
import { ErrorCode, PlatformError } from "@decant/core"
import { mapWwAvailabilityToAvailability } from "./mappers/availability.mapper"
import { mapWwCartToCart, mapWwPriceToTotals } from "./mappers/cart.mapper"
import { mapWwClubToClub } from "./mappers/club.mapper"
import { mapWwMemberToMember } from "./mappers/member.mapper"
import { mapWwOrderToOrder } from "./mappers/order.mapper"
import {
  mapWwProductToProduct,
  type MapProductOptions,
} from "./mappers/product.mapper"
import { WwProductListResponseSchema } from "./schemas/product.schema"

const PLATFORM = "withwine"
const DEFAULT_BASE_URL = "https://secure.withwine.com"
/** Per-request network timeout so a wrong apiUrl fails fast, not after 55s. */
const REQUEST_TIMEOUT_MS = 20_000

/**
 * Adapter for the WithWine platform.
 *
 * Covers the *public catalog* read path (products) used to render data in
 * Framer. Talks to the WithWine REST API server-side with the brand's client
 * credential — it does NOT use `@withwine/sdk`, which is reserved for the
 * customer auth/session flow (login, club, orders) and requires a Next.js host.
 *
 * Confirmed against the WithWine API (catalog read):
 *   - Base host:  https://secure.withwine.com  (override via config.apiUrl, e.g. staging)
 *   - Auth:       Authorization: clientid <clientId>
 *   - Brand:      passed as the `id` query param (NOT a header)
 *   - List path:  GET /api/wine/Products?id=<brandId>&availableToBuyOnly=true&include...=true&pageSize=N
 *   - Response:   { currentPage, pageCount, pageSize, totalCount, data: [...] }
 *   - Product fields confirmed from a populated backend example (see product.schema.ts).
 *
 * Config mapping (generic core Config -> WithWine concepts):
 *   - config.apiKey       -> WithWine clientId credential (server-side only)
 *   - config.storeId      -> WithWine WineryBrandId
 *   - config.apiUrl       -> base host (defaults to https://secure.withwine.com)
 *   - config.assetBaseUrl -> CDN base for relative image paths (coverPhotoPath)
 *
 * STILL unconfirmed: the `wineType` int->name enum mapping, and the
 * cart/order/member/club/availability endpoints below (only the catalog was documented).
 */
export class WithWineAdapter implements PlatformAdapter {
  constructor(private readonly config: Config) {
    if (config.platform !== "withwine") {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "WithWineAdapter requires config.platform === 'withwine'",
        PLATFORM
      )
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.requestJson(
      "GET",
      `/api/wine/Products?${this.listParams()}`
    )
    const list = WwProductListResponseSchema.safeParse(data)
    const rawList = list.success ? (list.data.data ?? []) : []
    return rawList.map((p) => mapWwProductToProduct(p, this.mapOptions()))
  }

  async getProduct(id: string): Promise<Product> {
    // The catalog endpoint accepts a comma-delimited `productIds` filter; fetch
    // through it and pick the exact id (falling back to the first result).
    const data = await this.requestJson(
      "GET",
      `/api/wine/Products?${this.listParams({ productIds: id })}`
    )
    const list = WwProductListResponseSchema.safeParse(data)
    const rawList = list.success ? (list.data.data ?? []) : []
    const products = rawList.map((p) =>
      mapWwProductToProduct(p, this.mapOptions())
    )
    const match = products.find((p) => p.id === id) ?? products[0]
    if (match) {
      return match
    }
    throw new PlatformError(
      ErrorCode.NOT_FOUND,
      `Product ${id} not found`,
      PLATFORM,
      404
    )
  }

  async createOrder(cartId: string): Promise<Order> {
    // TODO(withwine): confirm the orders endpoint (not in the catalog docs).
    const data = await this.requestJson("POST", `/api/order/orders`, {
      body: JSON.stringify({ cartId }),
    })
    const order = mapWwOrderToOrder(data, this.config.currency)
    if (!order.id) {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid order response from WithWine",
        PLATFORM
      )
    }
    return order
  }

  /**
   * Server-synced cart, keyed by the client-generated session id (passed here as
   * `sessionKey`). Verified live against greenway staging (2026-06-29):
   *   GET /api/cart?BrandId=<id>&UnauthenticatedSessionId=<sid>
   */
  async getCart(sessionKey: string): Promise<Cart> {
    const params = new URLSearchParams({
      BrandId: this.config.storeId,
      UnauthenticatedSessionId: sessionKey,
    })
    const data = await this.requestJson("GET", `/api/cart?${params.toString()}`)
    return mapWwCartToCart(data, sessionKey, this.config.currency, this.config.assetBaseUrl)
  }

  /** POST /api/cart/update — upsert lines (Quantity 0 removes); returns the cart. */
  async updateCart(sessionKey: string, items: Cart["items"]): Promise<Cart> {
    const data = await this.requestJson("POST", `/api/cart/update`, {
      body: JSON.stringify({
        UnauthenticatedSessionId: sessionKey,
        BrandId: this.brandId(),
        IncludeCart: true,
        Items: items.map(toWwItem),
      }),
    })
    return mapWwCartToCart(data, sessionKey, this.config.currency, this.config.assetBaseUrl)
  }

  /**
   * Live totals/tax/shipping for a set of lines. WithWine's price endpoint needs
   * the items explicitly (it does NOT read the session cart) and surfaces
   * validation (e.g. "Orders must be shippable in boxes of 6") in `errors`.
   */
  async priceCart(sessionKey: string, items: Cart["items"]): Promise<CartTotals> {
    const data = await this.requestJson("POST", `/api/order/price`, {
      body: JSON.stringify({
        BrandId: this.brandId(),
        UnauthenticatedSessionId: sessionKey,
        Items: items.map(toWwItem),
      }),
    })
    return mapWwPriceToTotals(data, this.config.currency)
  }

  /**
   * POST /api/cart/complete — mark the session's cart completed after an order.
   *
   * Optional fallback: WithWine already auto-completes and clears the cart when
   * the checkout link carries `sessionKey={UnauthenticatedSessionId}` (confirmed
   * by WithWine's CTO, 2026-06-30). Kept as a belt-and-suspenders manual path.
   */
  async completeCart(sessionKey: string, orderId: string): Promise<void> {
    await this.requestJson("POST", `/api/cart/complete`, {
      body: JSON.stringify({
        UnauthenticatedSessionId: sessionKey,
        BrandId: this.brandId(),
        OrderId: orderId,
      }),
    })
  }

  /** BrandId as a number when storeId is numeric (the API expects a number). */
  private brandId(): number | string {
    const n = Number(this.config.storeId)
    return Number.isFinite(n) && this.config.storeId !== "" ? n : this.config.storeId
  }

  async getMember(memberId: string): Promise<Member> {
    // TODO(withwine): confirm the member endpoint (not in the catalog docs).
    const data = await this.requestJson(
      "GET",
      `/api/customer/customers/${encodeURIComponent(memberId)}`
    )
    return mapWwMemberToMember(data)
  }

  async getClub(clubId: string): Promise<Club> {
    // TODO(withwine): confirm the club endpoint (not in the catalog docs).
    const data = await this.requestJson(
      "GET",
      `/api/club/clubs/${encodeURIComponent(clubId)}`
    )
    return mapWwClubToClub(data)
  }

  async getAvailability(productId: string): Promise<Availability> {
    // TODO(withwine): WithWine likely encodes availability on the product itself
    // (availableToBuyOnly). Revisit once the product object shape is confirmed.
    const data = await this.requestJson(
      "GET",
      `/api/product/availability/${encodeURIComponent(productId)}`
    )
    return mapWwAvailabilityToAvailability(data, productId)
  }

  /**
   * WithWine's order is fully URL-driven: `productIds`/`quantities` (parallel
   * CSV arrays) define the cart on the hosted checkout, with optional
   * shipping-estimate prefills. No server cart is required.
   */
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const lines = (input.items ?? [])
      .map((i) => ({
        id: String(i.id ?? "").trim(),
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 0)),
      }))
      .filter((i) => i.id && i.quantity > 0)
    if (lines.length === 0) {
      throw new PlatformError(ErrorCode.VALIDATION_ERROR, "Cart is empty", PLATFORM)
    }

    const params = new URLSearchParams()
    params.set("productIds", lines.map((i) => i.id).join(","))
    params.set("quantities", lines.map((i) => i.quantity).join(","))
    if (input.country) params.set("country", String(input.country))
    if (input.stateId != null && input.stateId !== "") params.set("stateId", String(input.stateId))
    if (input.postcode) params.set("postcode", String(input.postcode))
    if (input.sessionKey) params.set("sessionKey", String(input.sessionKey))

    return { url: `${this.requireBase()}/WithWineOrder/Checkout/?${params.toString()}` }
  }

  private mapOptions(): MapProductOptions {
    return {
      currency: this.config.currency,
      assetBaseUrl: this.config.assetBaseUrl,
    }
  }

  /** Standard public-catalog query params, with optional overrides/additions. */
  private listParams(extra: Record<string, string> = {}): string {
    const params = new URLSearchParams({
      id: this.config.storeId,
      availableToBuyOnly: "true",
      includeWines: "true",
      includeMixes: "true",
      includeOtherProducts: "true",
      includeGiftCards: "true",
      pageSize: "1000",
      ...extra,
    })
    return params.toString()
  }

  private requireBase(): string {
    return (this.config.apiUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  }

  private authHeaders(withJsonBody: boolean): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `clientid ${this.config.apiKey}`,
      Accept: "application/json",
    }
    if (withJsonBody) {
      h["Content-Type"] = "application/json"
    }
    return h
  }

  private async requestJson(
    method: string,
    path: string,
    init?: RequestInit
  ): Promise<unknown> {
    const url = `${this.requireBase()}${path}`
    const withBody = Boolean(init?.body)
    try {
      const res = await fetch(url, {
        ...init,
        method,
        headers: {
          ...this.authHeaders(withBody),
          ...normalizeHeaders(init?.headers),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const text = await res.text()
      if (res.status === 404) {
        throw new PlatformError(
          ErrorCode.NOT_FOUND,
          "Resource not found",
          PLATFORM,
          404
        )
      }
      if (!res.ok) {
        throw new PlatformError(
          ErrorCode.PLATFORM_ERROR,
          text || res.statusText,
          PLATFORM,
          res.status
        )
      }
      if (!text) {
        return null
      }
      try {
        return JSON.parse(text) as unknown
      } catch {
        throw new PlatformError(
          ErrorCode.VALIDATION_ERROR,
          "Invalid JSON from WithWine",
          PLATFORM,
          res.status
        )
      }
    } catch (e: unknown) {
      if (e instanceof PlatformError) {
        throw e
      }
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError"
      const message = isTimeout
        ? `WithWine request timed out after ${REQUEST_TIMEOUT_MS / 1000}s — check apiUrl and credentials.`
        : e instanceof Error
          ? e.message
          : "Network error"
      throw new PlatformError(ErrorCode.NETWORK_ERROR, message, PLATFORM)
    }
  }
}

/** Map a core cart line → the WithWine `Items` payload shape. */
function toWwItem(item: Cart["items"][number]): Record<string, unknown> {
  const productId = Number(item.productId)
  const out: Record<string, unknown> = {
    ProductId: Number.isFinite(productId) ? productId : item.productId,
    Quantity: item.quantity,
  }
  if (item.options && item.options.length > 0) {
    out.Options = item.options.map((o) => {
      const optId = Number(o.productId)
      return {
        productId: Number.isFinite(optId) ? optId : o.productId,
        name: o.name,
        quantity: o.quantity,
        forItemQuantityIndex: o.forItemQuantityIndex ?? null,
      }
    })
  }
  return out
}

function normalizeHeaders(
  h: HeadersInit | undefined
): Record<string, string> {
  if (!h) return {}
  if (h instanceof Headers) {
    const o: Record<string, string> = {}
    h.forEach((v, k) => {
      o[k] = v
    })
    return o
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h)
  }
  return { ...h }
}
