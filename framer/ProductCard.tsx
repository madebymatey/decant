// ProductCard.tsx — presentational product card + Add to Cart.
// The card declares its OWN data needs via PRODUCT_CARD_FIELDS; ProductGrid
// requests exactly those fields from the middleware (nothing more).

import { addPropertyControls, ControlType } from "framer"
import type { CSSProperties } from "react"
import { addToCart, type DecantProduct } from "./decant"

/** The only fields this card needs. Keep in sync with what the card renders. */
export const PRODUCT_CARD_FIELDS = [
  "id",
  "title",
  "image",
  "images",
  "price",
  "priceLabel",
  "category",
  "available",
]

const PLACEHOLDER: DecantProduct = {
  id: "placeholder",
  title: "Estate Cabernet Sauvignon",
  category: "Red Wine",
  price: 65,
  priceLabel: "$65.00",
  available: true,
}

type ProductCardProps = {
  product?: DecantProduct
  showCategory: boolean
  showPrice: boolean
  addToCartLabel: string
  accent: string
  radius: number
  style?: CSSProperties
}

export function ProductCard(props: ProductCardProps) {
  const { product, showCategory, showPrice, addToCartLabel, accent, radius, style } = props
  const p = product ?? PLACEHOLDER
  const soldOut = p.available === false
  const image = p.image ?? p.images?.[0]
  const priceText = p.priceLabel ?? (typeof p.price === "number" ? `$${p.price}` : "")

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderRadius: radius,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #ececec",
        fontFamily: "Inter, system-ui, sans-serif",
        ...style,
      }}
    >
      <div style={{ aspectRatio: "3 / 4", background: "#f4f4f4", overflow: "hidden" }}>
        {image ? (
          <img
            src={image}
            alt={p.title ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 12px 12px" }}>
        {showCategory && p.category ? (
          <span style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8a8a" }}>
            {p.category}
          </span>
        ) : null}

        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{p.title ?? ""}</span>

        {showPrice && priceText ? (
          <span style={{ fontSize: 14, color: "#1a1a1a" }}>{priceText}</span>
        ) : null}

        <button
          type="button"
          disabled={soldOut}
          onClick={() => addToCart(p)}
          style={{
            marginTop: 8,
            padding: "10px 14px",
            borderRadius: radius > 8 ? 8 : radius,
            border: "none",
            cursor: soldOut ? "not-allowed" : "pointer",
            background: soldOut ? "#d8d8d8" : accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {soldOut ? "Sold out" : addToCartLabel}
        </button>
      </div>
    </div>
  )
}

ProductCard.defaultProps = {
  showCategory: true,
  showPrice: true,
  addToCartLabel: "Add to cart",
  accent: "#7b1e3b",
  radius: 12,
}

addPropertyControls(ProductCard, {
  showCategory: { type: ControlType.Boolean, title: "Category", defaultValue: true },
  showPrice: { type: ControlType.Boolean, title: "Price", defaultValue: true },
  addToCartLabel: { type: ControlType.String, title: "Button", defaultValue: "Add to cart" },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#7b1e3b" },
  radius: { type: ControlType.Number, title: "Radius", min: 0, max: 32, defaultValue: 12 },
})
