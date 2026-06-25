import type { Availability, Cart, Club, Member, Order, Product } from "../types"

export interface PlatformAdapter {
  getProducts(): Promise<Product[]>
  getProduct(id: string): Promise<Product>
  createOrder(cartId: string): Promise<Order>
  getCart(cartId: string): Promise<Cart>
  updateCart(cartId: string, items: Cart["items"]): Promise<Cart>
  getMember(memberId: string): Promise<Member>
  getClub(clubId: string): Promise<Club>
  getAvailability(productId: string): Promise<Availability>
}
