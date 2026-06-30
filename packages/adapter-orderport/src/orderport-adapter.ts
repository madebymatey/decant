import type {
  Availability,
  Cart,
  Club,
  Config,
  Member,
  Order,
  PlatformAdapter,
  Product,
} from "@decant/core"
import { ErrorCode, PlatformError } from "@decant/core"
import { mapOpAvailabilityToAvailability } from "./mappers/availability.mapper"
import { mapOpCartToCart } from "./mappers/cart.mapper"
import { mapOpClubToClub } from "./mappers/club.mapper"
import { mapOpMemberToMember } from "./mappers/member.mapper"
import { mapOpOrderToOrder } from "./mappers/order.mapper"
import { mapOpProductToProduct } from "./mappers/product.mapper"
import {
  OpProductListResponseSchema,
  OpProductSchema,
} from "./schemas/product.schema"

/** Per-request network timeout so a wrong apiUrl fails fast, not after 55s. */
const REQUEST_TIMEOUT_MS = 20_000

export class OrderPortAdapter implements PlatformAdapter {
  constructor(private readonly config: Config) {
    if (config.platform !== "orderport") {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "OrderPortAdapter requires config.platform === 'orderport'",
        "orderport"
      )
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.requestJson("GET", `/v1/products`)
    const list = OpProductListResponseSchema.safeParse(data)
    const rawList = list.success
      ? (list.data.items ?? list.data.products ?? [])
      : []
    return rawList.map((p) => mapOpProductToProduct(p, this.config.currency))
  }

  async getProduct(id: string): Promise<Product> {
    const data = await this.requestJson(
      "GET",
      `/v1/products/${encodeURIComponent(id)}`
    )
    const single = OpProductSchema.safeParse(data)
    if (single.success) {
      return mapOpProductToProduct(single.data, this.config.currency)
    }
    throw new PlatformError(
      ErrorCode.NOT_FOUND,
      `Product ${id} not found`,
      "orderport",
      404
    )
  }

  async createOrder(cartId: string): Promise<Order> {
    const data = await this.requestJson("POST", `/v1/orders`, {
      body: JSON.stringify({ cartId }),
    })
    const order = mapOpOrderToOrder(data, this.config.currency)
    if (!order.id) {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid order response from OrderPort",
        "orderport"
      )
    }
    return order
  }

  async getCart(cartId: string): Promise<Cart> {
    const data = await this.requestJson(
      "GET",
      `/v1/carts/${encodeURIComponent(cartId)}`
    )
    return mapOpCartToCart(data, this.config.currency)
  }

  async updateCart(cartId: string, items: Cart["items"]): Promise<Cart> {
    const data = await this.requestJson(
      "PATCH",
      `/v1/carts/${encodeURIComponent(cartId)}`,
      {
        body: JSON.stringify({ items }),
      }
    )
    return mapOpCartToCart(data, this.config.currency)
  }

  async getMember(memberId: string): Promise<Member> {
    const data = await this.requestJson(
      "GET",
      `/v1/members/${encodeURIComponent(memberId)}`
    )
    return mapOpMemberToMember(data)
  }

  async getClub(clubId: string): Promise<Club> {
    const data = await this.requestJson(
      "GET",
      `/v1/clubs/${encodeURIComponent(clubId)}`
    )
    return mapOpClubToClub(data)
  }

  async getAvailability(productId: string): Promise<Availability> {
    const data = await this.requestJson(
      "GET",
      `/v1/availability/${encodeURIComponent(productId)}`
    )
    return mapOpAvailabilityToAvailability(data, productId)
  }

  private requireBase(): string {
    const base = this.config.apiUrl?.replace(/\/$/, "") ?? ""
    if (!base) {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "apiUrl is required for OrderPortAdapter",
        "orderport"
      )
    }
    return base
  }

  private authHeaders(withJsonBody: boolean): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-Store-Id": this.config.storeId,
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
          "orderport",
          404
        )
      }
      if (!res.ok) {
        throw new PlatformError(
          ErrorCode.PLATFORM_ERROR,
          text || res.statusText,
          "orderport",
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
          "Invalid JSON from OrderPort",
          "orderport",
          res.status
        )
      }
    } catch (e: unknown) {
      if (e instanceof PlatformError) {
        throw e
      }
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError"
      const message = isTimeout
        ? `OrderPort request timed out after ${REQUEST_TIMEOUT_MS / 1000}s — check apiUrl and credentials.`
        : e instanceof Error
          ? e.message
          : "Network error"
      throw new PlatformError(ErrorCode.NETWORK_ERROR, message, "orderport")
    }
  }
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
