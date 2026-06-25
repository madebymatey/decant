export type CartItem = {
  productId: string
  quantity: number
  variantId?: string
}

export type Cart = {
  id: string
  items: CartItem[]
  currency: string
}
