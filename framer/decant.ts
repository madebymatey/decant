// decant.ts — shared client for the Decant → WithWine middleware.
// Paste this into Framer as a code file; the components import from "./decant".
//
// Responsibilities:
//   - acquire + cache the short-lived origin-bound token (POST /api/token)
//   - fetch products with a per-component field selection (?fields=...)
//   - a local cart (localStorage) that works today; swap for the WithWine cart
//     once those endpoints are confirmed.

import { useEffect, useState } from "react"

/** Product shape returned by the middleware. All fields optional because each
 *  request is field-trimmed (you only get back what you asked for). */
export type DecantProduct = {
  id: string
  title?: string
  description?: string
  slug?: string
  image?: string
  images?: string[]
  price?: number | null
  priceLabel?: string | null
  compareAtPrice?: number | null
  compareAtLabel?: string | null
  currency?: string
  sku?: string
  available?: boolean
  category?: string | null
  vintage?: number | null
  varietal?: string | null
  region?: string | null
}

const trimSlash = (s: string) => s.replace(/\/$/, "")

// ---------- token (cached + de-duped across components) ----------
let tokenCache: { token: string; expiresAt: number } | null = null
let tokenInFlight: Promise<string> | null = null

async function getToken(baseUrl: string): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt - 5000 > now) return tokenCache.token
  if (!tokenInFlight) {
    tokenInFlight = (async () => {
      const res = await fetch(`${trimSlash(baseUrl)}/api/token`, { method: "POST" })
      if (!res.ok) throw new Error(`token request failed (${res.status})`)
      const data = (await res.json()) as { token: string; expiresIn: number }
      tokenCache = { token: data.token, expiresAt: Date.now() + data.expiresIn * 1000 }
      return data.token
    })().finally(() => {
      tokenInFlight = null
    })
  }
  return tokenInFlight
}

async function authedFetch(baseUrl: string, path: string): Promise<unknown> {
  const token = await getToken(baseUrl)
  const res = await fetch(`${trimSlash(baseUrl)}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

const fieldsQuery = (fields?: string[]) =>
  fields && fields.length ? `?fields=${fields.join(",")}` : ""

export async function fetchProducts(
  baseUrl: string,
  opts: { fields?: string[] } = {}
): Promise<DecantProduct[]> {
  const data = (await authedFetch(baseUrl, `/api/products${fieldsQuery(opts.fields)}`)) as {
    items?: DecantProduct[]
  }
  return data.items ?? []
}

export async function fetchProduct(
  baseUrl: string,
  id: string,
  opts: { fields?: string[] } = {}
): Promise<DecantProduct | null> {
  const data = (await authedFetch(
    baseUrl,
    `/api/products/${encodeURIComponent(id)}${fieldsQuery(opts.fields)}`
  )) as { product?: DecantProduct }
  return data.product ?? null
}

/** Fetch a product list, requesting only `fields`. */
export function useProducts(baseUrl: string, fields: string[]) {
  const [products, setProducts] = useState<DecantProduct[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const fieldsKey = fields.join(",")

  useEffect(() => {
    if (!baseUrl) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchProducts(baseUrl, { fields })
      .then((p) => {
        if (!cancelled) {
          setProducts(p)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [baseUrl, fieldsKey])

  return { products, loading, error }
}

// ---------- local cart (works now; replace with WithWine cart later) ----------
export type CartItem = {
  id: string
  title?: string
  price?: number | null
  image?: string
  quantity: number
}

const CART_KEY = "decant.cart.v1"
const CART_EVENT = "decant:cart"

function readCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

export function addToCart(
  product: { id: string; title?: string; price?: number | null; image?: string },
  quantity = 1
): void {
  const items = readCart()
  const existing = items.find((i) => i.id === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({
      id: product.id,
      title: product.title,
      price: product.price ?? null,
      image: product.image,
      quantity,
    })
  }
  writeCart(items)
}

/** Set an item's quantity; a quantity <= 0 removes the line. */
export function setQuantity(id: string, quantity: number): void {
  const items = readCart()
  const item = items.find((i) => i.id === id)
  if (!item) return
  if (quantity <= 0) {
    writeCart(items.filter((i) => i.id !== id))
  } else {
    item.quantity = quantity
    writeCart(items)
  }
}

/** Remove a line from the cart. */
export function removeFromCart(id: string): void {
  writeCart(readCart().filter((i) => i.id !== id))
}

export type CheckoutOptions = {
  /** ISO country (e.g. "AU"). Optional — WithWine collects the address at checkout. */
  country?: string
  /** WithWine state id, for an optional shipping-estimate prefill. */
  stateId?: string | number
  /** Postcode, for an optional shipping-estimate prefill. */
  postcode?: string
}

/**
 * Hand the cart off to WithWine's hosted checkout. Asks the middleware to build
 * the checkout URL (cart encoded as productIds/quantities) and redirects there.
 * WithWine owns payment, tax, shipping and compliance, then returns the customer
 * to /CheckoutSuccess?oid=<orderId>. No server-side cart is involved — the cart
 * lives here (localStorage) until this hand-off.
 */
export async function checkout(
  baseUrl: string,
  opts: CheckoutOptions = {}
): Promise<void> {
  const items = readCart().map((i) => ({ id: i.id, quantity: i.quantity }))
  if (items.length === 0) return
  const token = await getToken(baseUrl)
  const res = await fetch(`${trimSlash(baseUrl)}/api/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items, ...opts }),
  })
  if (!res.ok) {
    throw new Error(`checkout failed (${res.status}): ${await res.text()}`)
  }
  const { url } = (await res.json()) as { url: string }
  window.location.href = url
}

/**
 * Reactive cart hook. Pass `baseUrl` (the middleware origin) to enable
 * `checkout()` — it needs that origin to build the WithWine hand-off URL.
 */
export function useCart(baseUrl?: string) {
  const [items, setItems] = useState<CartItem[]>([])
  useEffect(() => {
    const sync = () => setItems(readCart())
    sync()
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
  return {
    items,
    count,
    total,
    addToCart,
    setQuantity,
    removeFromCart,
    clear: () => writeCart([]),
    checkout: (opts?: CheckoutOptions) => checkout(baseUrl ?? "", opts),
  }
}
