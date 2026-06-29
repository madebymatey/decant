// ProductList.tsx — fetches the catalog, applies the active facet filters
// (set by WineTypeFilter etc.), and renders your designed Product Card per
// product. Card data flows via props (for native layers bound to the card's
// variables) and via product context (for code components like AddToCart).

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { cloneElement, isValidElement, createElement } from "react"
import {
  useProducts,
  useFilters,
  productMatchesFilters,
  getProductContext,
  type DecantProduct,
} from "./decant.ts"

const FIELDS = [
  "id",
  "title",
  "slug",
  "image",
  "images",
  "price",
  "priceLabel",
  "compareAtPrice",
  "compareAtLabel",
  "available",
  "wineType",
  "varietal",
  "region",
  "vintage",
]

interface Props {
  baseUrl?: string
  productCard?: unknown
  emptyState?: unknown
  columns?: number
  gap?: number
  limit?: number
  emptyLabel?: string
  style?: React.CSSProperties
}

const CANVAS_PREVIEWS: DecantProduct[] = [
  { id: "p1", title: "Estate Shiraz", price: 65, priceLabel: "$65.00", wineType: "Red", varietal: "Shiraz" },
  { id: "p2", title: "Riesling 2021", price: 32, priceLabel: "$32.00", wineType: "White", varietal: "Riesling" },
  { id: "p3", title: "Rosé", price: 28, priceLabel: "$28.00", wineType: "Rosé", varietal: "Rosé" },
]

function isRenderable(node: unknown): boolean {
  if (node == null) return false
  if (Array.isArray(node)) return node.some(isRenderable)
  return true
}

function makeCard(node: unknown, props: Record<string, unknown>, key: string): React.ReactNode {
  if (node == null) return null
  if (Array.isArray(node)) return makeCard(node.find((n) => n != null), props, key)
  if (typeof node === "function") return createElement(node as React.ComponentType<any>, { key, ...props })
  if (isValidElement(node)) return cloneElement(node as React.ReactElement, { key, ...props })
  return <span key={key} style={{ display: "contents" }}>{node as React.ReactNode}</span>
}

export function ProductList({
  baseUrl,
  productCard,
  emptyState,
  columns = 3,
  gap = 16,
  limit = 0,
  emptyLabel = "No products match your filters.",
  style,
}: Props) {
  const onCanvas = RenderTarget.current() === RenderTarget.canvas
  const { products, loading, error } = useProducts(baseUrl, FIELDS)
  const filters = useFilters()
  const ProductContext = getProductContext()
  const hasCard = isRenderable(productCard)

  const grid = (children: React.ReactNode) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  )

  const renderCard = (p: DecantProduct, count: number) => {
    const key = `${count}:${p.id}`
    return (
      <ProductContext.Provider key={key} value={p}>
        <div className="decant-pl-fill" style={{ width: "100%" }}>
          {makeCard(
            productCard,
            {
              productId: p.id,
              title: p.title ?? "",
              image: p.image ?? p.images?.[0] ?? "",
              price: p.price ?? 0,
              priceLabel: p.priceLabel ?? "",
              wineType: p.wineType ?? "",
              varietal: p.varietal ?? "",
            },
            key
          )}
        </div>
      </ProductContext.Provider>
    )
  }

  const fillStyle = <style>{`.decant-pl-fill > * { width: 100% !important; max-width: 100% !important; }`}</style>

  // Canvas — preview cards so layout is visible
  if (onCanvas) {
    if (!hasCard) {
      return grid(
        CANVAS_PREVIEWS.map((_, i) => (
          <div
            key={i}
            style={{
              height: 280,
              borderRadius: 8,
              background: "#f4f4f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12,
              color: "#aaa",
            }}
          >
            Connect a Product Card →
          </div>
        ))
      )
    }
    return grid(<>{fillStyle}{CANVAS_PREVIEWS.map((p) => renderCard(p, CANVAS_PREVIEWS.length))}</>)
  }

  const hint = (text: string) => (
    <div
      style={{
        gridColumn: "1 / -1",
        padding: 24,
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        color: "#999",
      }}
    >
      {text}
    </div>
  )

  if (loading) return grid(hint("Loading…"))
  if (error) return grid(hint(`Error: ${error}`))

  let filtered = products.filter((p) => productMatchesFilters(p, filters))
  if (limit > 0) filtered = filtered.slice(0, limit)

  if (filtered.length === 0) {
    if (isRenderable(emptyState)) return <>{emptyState as React.ReactNode}</>
    return grid(hint(emptyLabel))
  }

  if (!hasCard) return grid(hint("Connect a Product Card in the properties panel →"))

  return grid(<>{fillStyle}{filtered.map((p) => renderCard(p, filtered.length))}</>)
}

ProductList.defaultProps = {
  columns: 3,
  gap: 16,
  limit: 0,
  emptyLabel: "No products match your filters.",
}

addPropertyControls(ProductList, {
  baseUrl: {
    type: ControlType.String,
    title: "Base URL",
    placeholder: "Uses DecantConfig if blank",
  },
  productCard: {
    type: ControlType.ComponentInstance,
    title: "Product Card",
  },
  emptyState: {
    type: ControlType.ComponentInstance,
    title: "Empty State",
  },
  columns: {
    type: ControlType.Number,
    title: "Columns",
    min: 1,
    max: 6,
    step: 1,
    displayStepper: true,
    defaultValue: 3,
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 0,
    max: 64,
    defaultValue: 16,
  },
  limit: {
    type: ControlType.Number,
    title: "Limit",
    min: 0,
    max: 200,
    defaultValue: 0,
    description: "0 = no limit.",
  },
  emptyLabel: {
    type: ControlType.String,
    title: "Empty label",
    defaultValue: "No products match your filters.",
    hidden: (props) => isValidElement(props.emptyState),
  },
})
