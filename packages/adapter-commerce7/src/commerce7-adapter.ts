import { Buffer } from "node:buffer"
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
import { mapC7AvailabilityToAvailability } from "./mappers/availability.mapper"
import { mapC7CartToCart } from "./mappers/cart.mapper"
import { mapC7ClubToClub } from "./mappers/club.mapper"
import { mapC7MemberToMember } from "./mappers/member.mapper"
import { mapC7OrderToOrder } from "./mappers/order.mapper"
import { mapC7ProductToProduct } from "./mappers/product.mapper"
import {
  C7ProductListResponseSchema,
  C7ProductSchema,
} from "./schemas/product.schema"

/** Per-request network timeout so a wrong apiUrl fails fast, not after 55s. */
const REQUEST_TIMEOUT_MS = 20_000

export class Commerce7Adapter implements PlatformAdapter {
  constructor(private readonly config: Config) {
    if (config.platform !== "commerce7") {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "Commerce7Adapter requires config.platform === 'commerce7'",
        "commerce7"
      )
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.requestJson("GET", `/product?cursor=start`)
    const list = C7ProductListResponseSchema.safeParse(data)
    const products = list.success ? (list.data.products ?? []) : []
    return products.map((p) => mapC7ProductToProduct(p, this.config.currency))
  }

  async getProduct(id: string): Promise<Product> {
    const data = await this.requestJson("GET", `/product/${encodeURIComponent(id)}`)
    const single = C7ProductSchema.safeParse(data)
    if (single.success) {
      return mapC7ProductToProduct(single.data, this.config.currency)
    }
    throw new PlatformError(
      ErrorCode.NOT_FOUND,
      `Product ${id} not found`,
      "commerce7",
      404
    )
  }

  async createOrder(cartId: string): Promise<Order> {
    const data = await this.requestJson("POST", `/order`, {
      body: JSON.stringify({ cartId }),
    })
    const order = mapC7OrderToOrder(data, this.config.currency)
    if (!order.id) {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid order response from Commerce7",
        "commerce7"
      )
    }
    return order
  }

  async getCart(cartId: string): Promise<Cart> {
    const data = await this.requestJson(
      "GET",
      `/cart/${encodeURIComponent(cartId)}`
    )
    return mapC7CartToCart(data, this.config.currency)
  }

  async updateCart(cartId: string, items: Cart["items"]): Promise<Cart> {
    const data = await this.requestJson(
      "PATCH",
      `/cart/${encodeURIComponent(cartId)}`,
      {
        body: JSON.stringify({ items }),
      }
    )
    return mapC7CartToCart(data, this.config.currency)
  }

  async getMember(memberId: string): Promise<Member> {
    const data = await this.requestJson(
      "GET",
      `/member/${encodeURIComponent(memberId)}`
    )
    return mapC7MemberToMember(data)
  }

  async getClub(clubId: string): Promise<Club> {
    const data = await this.requestJson(
      "GET",
      `/club/${encodeURIComponent(clubId)}`
    )
    return mapC7ClubToClub(data)
  }

  async getAvailability(productId: string): Promise<Availability> {
    const data = await this.requestJson(
      "GET",
      `/availability/${encodeURIComponent(productId)}`
    )
    return mapC7AvailabilityToAvailability(data, productId)
  }

  private requireBase(): string {
    const base = this.config.apiUrl?.replace(/\/$/, "") ?? ""
    if (!base) {
      throw new PlatformError(
        ErrorCode.VALIDATION_ERROR,
        "apiUrl is required for Commerce7Adapter",
        "commerce7"
      )
    }
    return base
  }

  private authHeaders(withJsonBody: boolean): Record<string, string> {
    const raw = this.config.apiKey
    const parts = raw.split(":")
    const appId = parts.length >= 2 ? parts[0] : this.config.storeId
    const appSecret = parts.length >= 2 ? parts.slice(1).join(":") : raw
    const token = Buffer.from(`${appId}:${appSecret}`).toString("base64")
    const h: Record<string, string> = {
      Authorization: `Basic ${token}`,
      tenant: this.config.storeId,
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
          "commerce7",
          404
        )
      }
      if (!res.ok) {
        throw new PlatformError(
          ErrorCode.PLATFORM_ERROR,
          text || res.statusText,
          "commerce7",
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
          "Invalid JSON from Commerce7",
          "commerce7",
          res.status
        )
      }
    } catch (e: unknown) {
      if (e instanceof PlatformError) {
        throw e
      }
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError"
      const message = isTimeout
        ? `Commerce7 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s — check apiUrl and credentials.`
        : e instanceof Error
          ? e.message
          : "Network error"
      throw new PlatformError(ErrorCode.NETWORK_ERROR, message, "commerce7")
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
