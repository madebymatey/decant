// ProductGrid.tsx — drop this on the canvas. It fetches the catalog requesting
// ONLY the fields ProductCard needs (PRODUCT_CARD_FIELDS), then renders cards.

import { addPropertyControls, ControlType } from "framer"
import { useProducts } from "./decant.ts"
import { ProductCard, PRODUCT_CARD_FIELDS } from "./ProductCard"

type ProductGridProps = {
  baseUrl?: string
  columns: number
  gap: number
  limit: number
  showCategory: boolean
  showPrice: boolean
  addToCartLabel: string
  accent: string
  radius: number
}

const hint = (text: string) => (
  <div
    style={{
      width: "100%",
      padding: 24,
      borderRadius: 12,
      border: "1px dashed #cfcfcf",
      color: "#8a8a8a",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 14,
      textAlign: "center",
    }}
  >
    {text}
  </div>
)

export function ProductGrid(props: ProductGridProps) {
  const { baseUrl, columns, gap, limit, showCategory, showPrice, addToCartLabel, accent, radius } = props
  const { products, loading, error } = useProducts(baseUrl, PRODUCT_CARD_FIELDS)

  if (!baseUrl && !loading) return hint("Drop a DecantConfig on the page, or set Base URL here →")
  if (loading) return hint("Loading products…")
  if (error) return hint(`Error: ${error}`)
  if (products.length === 0) return hint("No products returned.")

  const items = limit > 0 ? products.slice(0, limit) : products

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        width: "100%",
      }}
    >
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          showCategory={showCategory}
          showPrice={showPrice}
          addToCartLabel={addToCartLabel}
          accent={accent}
          radius={radius}
        />
      ))}
    </div>
  )
}

ProductGrid.defaultProps = {
  baseUrl: "",
  columns: 3,
  gap: 16,
  limit: 0,
  showCategory: true,
  showPrice: true,
  addToCartLabel: "Add to cart",
  accent: "#7b1e3b",
  radius: 12,
}

addPropertyControls(ProductGrid, {
  baseUrl: {
    type: ControlType.String,
    title: "Base URL",
    placeholder: "Uses DecantConfig if blank",
  },
  columns: { type: ControlType.Number, title: "Columns", min: 1, max: 6, step: 1, displayStepper: true, defaultValue: 3 },
  gap: { type: ControlType.Number, title: "Gap", min: 0, max: 64, defaultValue: 16 },
  limit: { type: ControlType.Number, title: "Limit", min: 0, max: 100, defaultValue: 0 },
  showCategory: { type: ControlType.Boolean, title: "Category", defaultValue: true },
  showPrice: { type: ControlType.Boolean, title: "Price", defaultValue: true },
  addToCartLabel: { type: ControlType.String, title: "Button", defaultValue: "Add to cart" },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#7b1e3b" },
  radius: { type: ControlType.Number, title: "Radius", min: 0, max: 32, defaultValue: 12 },
})
