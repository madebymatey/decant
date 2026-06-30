import { useEffect, useState, createContext, useContext } from "react"

// Framer bundles each code file as a separate module instance, so module-level
// variables are NOT shared between components. Shared state lives on globalThis
// instead — the only store shared across all module instances in the same realm
// (works in both the browser and Framer's SSR / Node render pass).

const G: Record<string, any> =
  typeof globalThis !== "undefined" ? (globalThis as any) : {}

const W = (): Record<string, any> =>
  typeof window !== "undefined" ? (window as any) : G

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
  wineType?: string | null
  vintage?: number | null
  varietal?: string | null
  region?: string | null
}

const trimSlash = (s: string) => s.replace(/\/$/, "")

/** URL-safe slug — matches the server's slugify so filter values line up. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ---------- global config ----------

export type DecantGlobalConfig = {
  baseUrl: string
  currency: string
  locale: string
}

const CONFIG_EVENT = "decant:config"
const DEFAULT_CONFIG: DecantGlobalConfig = { baseUrl: "", currency: "USD", locale: "en-US" }

function getStoredConfig(): DecantGlobalConfig {
  return W().__decantConfig ?? DEFAULT_CONFIG
}

export function setGlobalConfig(cfg: Partial<DecantGlobalConfig>): void {
  const current = getStoredConfig()
  const urlChanged = cfg.baseUrl !== undefined && cfg.baseUrl !== current.baseUrl
  W().__decantConfig = { ...current, ...cfg }
  if (urlChanged) W().__decantTokenCache = null
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CONFIG_EVENT))
}

export function getGlobalConfig(): DecantGlobalConfig {
  return getStoredConfig()
}

export function useGlobalConfig(): DecantGlobalConfig {
  const [cfg, setCfg] = useState<DecantGlobalConfig>(getStoredConfig)
  useEffect(() => {
    const sync = () => setCfg(getStoredConfig())
    window.addEventListener(CONFIG_EVENT, sync)
    return () => window.removeEventListener(CONFIG_EVENT, sync)
  }, [])
  return cfg
}

// ---------- token ----------

async function getToken(baseUrl: string): Promise<string> {
  const now = Date.now()
  const cache = W().__decantTokenCache as { token: string; expiresAt: number } | undefined
  if (cache && cache.expiresAt - 5000 > now) return cache.token

  let inFlight = W().__decantTokenInFlight as Promise<string> | undefined
  if (!inFlight) {
    inFlight = (async () => {
      const res = await fetch(`${trimSlash(baseUrl)}/api/token`, { method: "POST" })
      if (!res.ok) throw new Error(`token request failed (${res.status})`)
      const data = (await res.json()) as { token: string; expiresIn: number }
      W().__decantTokenCache = { token: data.token, expiresAt: Date.now() + data.expiresIn * 1000 }
      return data.token
    })().finally(() => { W().__decantTokenInFlight = null })
    W().__decantTokenInFlight = inFlight
  }
  return inFlight
}

async function authedFetch(baseUrl: string, path: string): Promise<unknown> {
  const token = await getToken(baseUrl)
  const res = await fetch(`${trimSlash(baseUrl)}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

const fieldsQuery = (fields?: string[]) =>
  fields && fields.length ? `?fields=${fields.join(",")}` : ""

export async function fetchProducts(
  baseUrl?: string,
  opts: { fields?: string[] } = {}
): Promise<DecantProduct[]> {
  const url = baseUrl || getGlobalConfig().baseUrl
  const data = (await authedFetch(url, `/api/products${fieldsQuery(opts.fields)}`)) as {
    items?: DecantProduct[]
  }
  const items = data.items ?? []
  rememberProducts(
    items.map((p) => ({ id: p.id, title: p.title, image: p.image ?? p.images?.[0], price: p.price ?? null }))
  )
  return items
}

export async function fetchProduct(
  baseUrl?: string,
  id?: string,
  opts: { fields?: string[] } = {}
): Promise<DecantProduct | null> {
  const url = baseUrl || getGlobalConfig().baseUrl
  if (!id) return null
  const data = (await authedFetch(
    url,
    `/api/products/${encodeURIComponent(id)}${fieldsQuery(opts.fields)}`
  )) as { product?: DecantProduct }
  const product = data.product ?? null
  if (product) {
    rememberProducts([
      { id: product.id, title: product.title, image: product.image ?? product.images?.[0], price: product.price ?? null },
    ])
  }
  return product
}

export function useProducts(baseUrl?: string, fields: string[] = []) {
  const config = useGlobalConfig()
  const resolvedUrl = baseUrl || config.baseUrl
  const [products, setProducts] = useState<DecantProduct[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const fieldsKey = fields.join(",")

  useEffect(() => {
    if (!resolvedUrl) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchProducts(resolvedUrl, { fields })
      .then((p) => { if (!cancelled) { setProducts(p); setError(null) } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [resolvedUrl, fieldsKey])

  return { products, loading, error }
}

// ---------- cart drawer state ----------

const DRAWER_EVENT = "decant:drawer"

function getDrawerOpen(): boolean { return W().__decantDrawer ?? false }

export function openCart(): void {
  W().__decantDrawer = true
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DRAWER_EVENT))
}

export function closeCart(): void {
  W().__decantDrawer = false
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DRAWER_EVENT))
}

export function toggleCart(): void {
  getDrawerOpen() ? closeCart() : openCart()
}

export function useCartDrawer() {
  const [open, setOpen] = useState(getDrawerOpen)
  useEffect(() => {
    const sync = () => setOpen(getDrawerOpen())
    window.addEventListener(DRAWER_EVENT, sync)
    return () => window.removeEventListener(DRAWER_EVENT, sync)
  }, [])
  return { open, openCart, closeCart, toggleCart }
}

// ---------- cart (server-synced, localStorage as cache/fallback) ----------
//
// The cart lives on WithWine (via the /api/cart proxy), keyed by an anonymous
// session id we generate and hold in localStorage. localStorage is an optimistic
// cache: every mutation updates it instantly (snappy UI + offline/demo fallback)
// and fires a background server upsert; the server response reconciles the cache.

export type CartItem = {
  id: string
  title?: string
  price?: number | null
  image?: string
  quantity: number
}

const CART_KEY = "decant.cart.v1"
const CART_EVENT = "decant:cart"
const SESSION_KEY = "decant.sessionKey.v1"

/** Stable anonymous session id — the key the WithWine cart is stored under. */
export function getSessionKey(): string {
  if (typeof window === "undefined") return ""
  let sid = window.localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid =
      (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as CartItem[] }
  catch { return [] }
}

function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

// Product metadata cache (id -> title/image/price), persisted in localStorage.
// WithWine cart lines carry no image, so cart rows fall back to this — populated
// whenever products are browsed or added, and it survives reloads.
const META_KEY = "decant.productMeta.v1"
type ProductMeta = { title?: string; image?: string; price?: number | null }

function readMeta(): Record<string, ProductMeta> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(window.localStorage.getItem(META_KEY) ?? "{}") as Record<string, ProductMeta> }
  catch { return {} }
}

export function rememberProducts(
  entries: Array<{ id: string | number; title?: string; image?: string; price?: number | null }>
): void {
  if (typeof window === "undefined" || entries.length === 0) return
  const meta = readMeta()
  for (const e of entries) {
    const id = String(e.id)
    const cur = meta[id] ?? {}
    meta[id] = {
      title: e.title ?? cur.title,
      image: e.image ?? cur.image,
      price: e.price ?? cur.price ?? null,
    }
  }
  window.localStorage.setItem(META_KEY, JSON.stringify(meta))
}

// Monotonic version bumped on every user cart mutation. Server responses only
// apply if the version hasn't advanced since the request was issued — this drops
// stale / out-of-order responses (e.g. an in-flight GET returning the old
// quantity after an optimistic change) that would otherwise cause a price flicker.
function cartVersion(): number { return W().__decantCartVersion ?? 0 }
function bumpCartVersion(): void { W().__decantCartVersion = cartVersion() + 1 }

/** Authed (token + origin) fetch against the cart proxy. */
async function cartRequest(baseUrl: string, path: string, init?: RequestInit): Promise<any> {
  const token = await getToken(baseUrl)
  const res = await fetch(`${trimSlash(baseUrl)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) throw new Error(`${path} failed (${res.status})`)
  return res.json()
}

/** Merge the authoritative server cart into the local cache, keeping title/image
 * from the cache when the server line omits them (cart lines have no image). */
function mapServerItems(serverItems: any[], local: CartItem[]): CartItem[] {
  const prevById = new Map(local.map((i) => [String(i.id), i]))
  const meta = readMeta()
  return serverItems.map((s) => {
    const id = String(s.productId)
    const prev = prevById.get(id)
    const m = meta[id]
    return {
      id,
      title: s.name ?? prev?.title ?? m?.title,
      price: s.unitPrice ?? prev?.price ?? m?.price ?? null,
      image: s.image ?? prev?.image ?? m?.image,
      quantity: s.quantity,
    }
  })
}

/** Upsert one line's absolute quantity on the server (0 removes), then reconcile.
 * No-op (local-only) when there's no baseUrl or the request fails. */
function syncLine(productId: string, quantity: number): void {
  const baseUrl = getGlobalConfig().baseUrl
  const sessionKey = getSessionKey()
  if (!baseUrl || !sessionKey) return
  const v = cartVersion()
  void cartRequest(baseUrl, "/api/cart/update", {
    method: "POST",
    body: JSON.stringify({ sessionKey, items: [{ productId, quantity }] }),
  })
    .then((cart) => {
      // Ignore if a newer mutation happened while this was in flight.
      if (cart && Array.isArray(cart.items) && cartVersion() === v) {
        writeCart(mapServerItems(cart.items, readCart()))
      }
    })
    .catch(() => { /* keep the optimistic local state */ })
}

/** Load the server cart on mount; seed it from localStorage if the server is empty. */
async function pullCart(): Promise<void> {
  const baseUrl = getGlobalConfig().baseUrl
  const sessionKey = getSessionKey()
  if (!baseUrl || !sessionKey) return
  const v = cartVersion()
  try {
    const cart = await cartRequest(baseUrl, `/api/cart?sessionKey=${encodeURIComponent(sessionKey)}`)
    // A mutation raced ahead of this load — let its own sync win, don't revert.
    if (cartVersion() !== v) return
    const serverItems = cart && Array.isArray(cart.items) ? cart.items : []
    const local = readCart()
    if (serverItems.length > 0) {
      writeCart(mapServerItems(serverItems, local))
    } else if (local.length > 0) {
      for (const i of local) syncLine(String(i.id), i.quantity) // seed server from cache
    }
  } catch { /* local-only fallback */ }
}

export function addToCart(
  product: { id: string | number; title?: string; price?: number | null; image?: string },
  quantity = 1
): void {
  const id = String(product.id)
  rememberProducts([{ id, title: product.title, image: product.image, price: product.price ?? null }])
  bumpCartVersion()
  const items = readCart()
  const existing = items.find((i) => String(i.id) === id)
  const newQty = (existing?.quantity ?? 0) + quantity
  if (existing) { existing.quantity = newQty }
  else { items.push({ id, title: product.title, price: product.price ?? null, image: product.image, quantity: newQty }) }
  writeCart(items)
  syncLine(id, newQty)
}

export function setQuantity(id: string | number, quantity: number): void {
  const key = String(id)
  const items = readCart()
  const item = items.find((i) => String(i.id) === key)
  if (!item && quantity > 0) return
  bumpCartVersion()
  if (quantity <= 0) writeCart(items.filter((i) => String(i.id) !== key))
  else { item!.quantity = quantity; writeCart(items) }
  syncLine(key, Math.max(0, quantity))
}

export function removeFromCart(id: string | number): void {
  const key = String(id)
  bumpCartVersion()
  writeCart(readCart().filter((i) => String(i.id) !== key))
  syncLine(key, 0)
}

/** Empty the cart (e.g. after a successful checkout) locally and on the server. */
export function clearCart(): void {
  const ids = readCart().map((i) => String(i.id))
  bumpCartVersion()
  writeCart([])
  for (const id of ids) syncLine(id, 0)
}

// ---------- per-line item context ----------
// React Context lets CartProductList give each rendered row its own cart item,
// which the row's code components (quantity, subtotal, remove, image) read via
// useCartLine(). The Context object itself is stored on globalThis so every
// duplicated Framer module instance shares the SAME context (otherwise the
// Provider and the consumer would use different context objects and never match).

export function getCartLineContext(): React.Context<CartItem | null> {
  if (!G.__decantCartLineContext) {
    G.__decantCartLineContext = createContext<CartItem | null>(null)
  }
  return G.__decantCartLineContext
}

/** Read the current row's cart item. Returns null outside a CartProductList row. */
export function useCartLine(): CartItem | null {
  return useContext(getCartLineContext())
}

// Legacy fallback (kept so older pastes don't break). Prefer useCartLine().
export function setCurrentItem(item: CartItem | null): void {
  W().__decantCurrentItem = item
}
export function getCurrentItem(): CartItem | null {
  return W().__decantCurrentItem ?? null
}

// ---------- checkout ----------

export type CheckoutOptions = {
  country?: string
  stateId?: string | number
  postcode?: string
}

export async function checkout(baseUrl?: string, opts: CheckoutOptions = {}): Promise<void> {
  const url = baseUrl || getGlobalConfig().baseUrl
  const items = readCart().map((i) => ({ id: i.id, quantity: i.quantity }))
  if (items.length === 0) return
  const sessionKey = getSessionKey()
  const token = await getToken(url)
  const res = await fetch(`${trimSlash(url)}/api/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // sessionKey rides along so the hosted checkout links back to this cart.
    body: JSON.stringify({ items, sessionKey, ...opts }),
  })
  if (!res.ok) throw new Error(`checkout failed (${res.status}): ${await res.text()}`)
  const { url: checkoutUrl } = (await res.json()) as { url: string }
  window.location.href = checkoutUrl
}

export function useCart(baseUrl?: string) {
  const config = useGlobalConfig()
  const resolvedUrl = baseUrl || config.baseUrl
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const sync = () => setItems(readCart())
    sync()
    // Reconcile with the server cart once the base URL is known.
    if (resolvedUrl) void pullCart().then(sync)
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [resolvedUrl])

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)

  return {
    items,
    count,
    total,
    currency: config.currency,
    addToCart,
    setQuantity,
    removeFromCart,
    clear: () => writeCart([]),
    checkout: (opts?: CheckoutOptions) => checkout(resolvedUrl, opts),
  }
}

// ---------- facet filters (multi-select, shared across components) ----------
// Each "facet" (e.g. "wineType", "varietal") holds the selected slugs. Stored on
// globalThis so the filter UI and the product list share one source of truth.

const FILTER_EVENT = "decant:filters"

function getFilters(): Record<string, string[]> {
  return W().__decantFilters ?? {}
}

function dispatchFilters(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(FILTER_EVENT))
}

export function toggleFilter(facet: string, value: string): void {
  const all = { ...getFilters() }
  const set = new Set(all[facet] ?? [])
  set.has(value) ? set.delete(value) : set.add(value)
  all[facet] = [...set]
  W().__decantFilters = all
  dispatchFilters()
}

export function clearFilter(facet?: string): void {
  if (facet) {
    const all = { ...getFilters() }
    delete all[facet]
    W().__decantFilters = all
  } else {
    W().__decantFilters = {}
  }
  dispatchFilters()
}

export function isFilterActive(facet: string, value: string): boolean {
  return (getFilters()[facet] ?? []).includes(value)
}

/** Reactive hook over a single facet's selected values. */
export function useFacet(facet: string) {
  const [selected, setSelected] = useState<string[]>(() => getFilters()[facet] ?? [])
  useEffect(() => {
    const sync = () => setSelected(getFilters()[facet] ?? [])
    sync()
    window.addEventListener(FILTER_EVENT, sync)
    return () => window.removeEventListener(FILTER_EVENT, sync)
  }, [facet])
  return {
    selected,
    isActive: (v: string) => selected.includes(v),
    toggle: (v: string) => toggleFilter(facet, v),
    clear: () => clearFilter(facet),
  }
}

/** Reactive hook over ALL active facets (used by the product list). */
export function useFilters() {
  const [filters, setFilters] = useState<Record<string, string[]>>(getFilters)
  useEffect(() => {
    const sync = () => setFilters({ ...getFilters() })
    sync()
    window.addEventListener(FILTER_EVENT, sync)
    return () => window.removeEventListener(FILTER_EVENT, sync)
  }, [])
  return filters
}

// Maps a facet name to the product field it filters on. Product values are
// slugified before comparison so they line up with the option slugs.
const FACET_FIELD: Record<string, (p: DecantProduct) => string | null | undefined> = {
  wineType: (p) => p.wineType,
  varietal: (p) => p.varietal,
  category: (p) => p.category,
  region: (p) => p.region,
}

/** True if a product satisfies every active facet (AND across facets, OR within). */
export function productMatchesFilters(
  p: DecantProduct,
  filters: Record<string, string[]>
): boolean {
  for (const [facet, values] of Object.entries(filters)) {
    if (!values || values.length === 0) continue
    const accessor = FACET_FIELD[facet]
    const raw = accessor ? accessor(p) : undefined
    const slug = raw ? slugify(raw) : ""
    if (!values.includes(slug)) return false
  }
  return true
}

// ---------- product card context (for slotted cards in the product list) ----------

export function getProductContext(): React.Context<DecantProduct | null> {
  if (!G.__decantProductContext) {
    G.__decantProductContext = createContext<DecantProduct | null>(null)
  }
  return G.__decantProductContext
}

/** Read the current card's product inside a ProductList row. */
export function useProductCard(): DecantProduct | null {
  return useContext(getProductContext())
}
