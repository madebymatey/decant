/** A pack/option selection on a cart line (some platforms price per pack). */
export type CartLineOption = {
  productId: string
  name: string
  quantity: number
  forItemQuantityIndex?: number | null
}

export type CartItem = {
  productId: string
  quantity: number
  variantId?: string
  // Display + pricing fields, populated by server-synced carts.
  name?: string
  image?: string
  /** Unit price for the chosen pack. */
  unitPrice?: number
  /** Line subtotal (quantity × unit, incl. options). */
  lineTotal?: number
  available?: boolean
  minimumUnitPurchase?: number
  options?: CartLineOption[]
}

export type Cart = {
  id: string
  items: CartItem[]
  currency: string
}

/** Order totals from a platform's price endpoint. */
export type CartTotals = {
  currency: string
  subTotal: number
  total: number
  tax: number
  shipping: number
  isFreeShipping: boolean
  /** Validation messages (e.g. pack/box rules), empty when priceable. */
  errors: string[]
}

/** One line handed to a platform's hosted checkout. */
export type CheckoutLine = {
  /** Platform product id — used by id-based checkouts (e.g. WithWine). */
  id: string
  /** Variant SKU — used by SKU-based checkouts (e.g. Commerce7 `addToCart`). */
  sku?: string
  quantity: number
}

/** Input to build a hosted-checkout handoff from a cart of lines. */
export type CheckoutInput = {
  items: CheckoutLine[]
  /** Optional shipping / compliance prefills. */
  country?: string
  stateId?: string | number
  postcode?: string
  /** Links the hosted checkout back to a server-synced cart, when supported. */
  sessionKey?: string
}

/** Result of a checkout handoff — a URL the browser redirects to. */
export type CheckoutResult = { url: string }
