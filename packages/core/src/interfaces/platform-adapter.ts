import type { Availability, Cart, CartTotals, Club, Member, Order, Product } from "../types"

export interface PlatformAdapter {
  getProducts(): Promise<Product[]>
  getProduct(id: string): Promise<Product>
  createOrder(cartId: string): Promise<Order>
  getCart(cartId: string): Promise<Cart>
  updateCart(cartId: string, items: Cart["items"]): Promise<Cart>
  getMember(memberId: string): Promise<Member>
  getClub(clubId: string): Promise<Club>
  getAvailability(productId: string): Promise<Availability>

  // ── Optional capabilities ──────────────────────────────────────────────────
  // Not every platform exposes these as discrete steps. Where a platform folds
  // pricing into getCart/updateCart, or completion into createOrder, it simply
  // omits them and callers fall back (see /api/cart/price, /api/cart/complete).

  /** Live re-pricing of a set of lines — tax, shipping, pack-rule errors. */
  priceCart?(cartId: string, items: Cart["items"]): Promise<CartTotals>
  /** Mark the platform cart completed once an order has been placed. */
  completeCart?(cartId: string, orderId: string): Promise<void>
}
