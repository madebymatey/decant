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
