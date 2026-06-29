// CartProductList.tsx — renders your Cart Item design once per cart line.
// Each row is wrapped in a per-line context Provider so the code components
// inside (CartQuantityInput, CartLineItemSubtotal, CartRemoveButton,
// CartProductImage) automatically read the right item — no manual lineId wiring.

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { cloneElement, isValidElement, createElement } from "react"
import { useCart, getCartLineContext, type CartItem } from "./decant.ts"

interface Props {
  cartListItem?: unknown
  emptyState?: unknown
  gap?: number
  itemWidth?: "fill" | "auto"
  scroll?: boolean
  padding?: string
  emptyLabel?: string
  emptyAlignX?: "left" | "center" | "right"
  emptyAlignY?: "top" | "center" | "bottom"
  style?: React.CSSProperties
}

const alignXMap = { left: "flex-start", center: "center", right: "flex-end" } as const
const alignYMap = { top: "flex-start", center: "center", bottom: "flex-end" } as const

const CANVAS_PREVIEWS: CartItem[] = [
  { id: "preview-1", title: "Product Name", image: "", price: 65, quantity: 2 },
  { id: "preview-2", title: "Another Product", image: "", price: 35, quantity: 1 },
]

// A connection exists if the slot is any non-empty value.
function isRenderable(node: unknown): boolean {
  if (node == null) return false
  if (Array.isArray(node)) return node.some(isRenderable)
  return true
}

// Render the connected template with per-row props. Framer may pass the slot as
// a component function, a React element, an array, or some other renderable node;
// try to inject props where possible, otherwise render it as-is (data still flows
// to inner code components via the line context Provider that wraps this).
function makeRow(node: unknown, props: Record<string, unknown>, key: string): React.ReactNode {
  if (node == null) return null
  if (Array.isArray(node)) {
    const first = node.find((n) => n != null)
    return makeRow(first, props, key)
  }
  if (typeof node === "function") {
    return createElement(node as React.ComponentType<any>, { key, ...props })
  }
  if (isValidElement(node)) {
    return cloneElement(node as React.ReactElement, { key, ...props })
  }
  // Unknown renderable form — render as-is (context still supplies row data)
  return <span key={key} style={{ display: "contents" }}>{node as React.ReactNode}</span>
}

export function CartProductList({ cartListItem, emptyState, gap, itemWidth, scroll, padding, emptyLabel, emptyAlignX, emptyAlignY, style }: Props) {
  const { items } = useCart()
  const onCanvas = RenderTarget.current() === RenderTarget.canvas
  const CartLineContext = getCartLineContext()
  const hasTemplate = isRenderable(cartListItem)
  const fill = itemWidth !== "auto"

  // When scroll is on, the list fills its parent's remaining height and scrolls
  // internally. minHeight:0 is required for a flex child to be allowed to shrink
  // and scroll instead of pushing the footer out.
  const scrollStyle: React.CSSProperties = scroll
    ? { flex: 1, minHeight: 0, height: "100%", overflowY: "auto" }
    : {}

  // Key includes the list length so any add/remove forces a clean remount of all
  // rows. Cloning the same Framer ComponentInstance N times doesn't reconcile
  // cleanly on removal (surviving rows blank out) — remounting avoids that.
  // Quantity edits keep the length the same, so they don't trigger a remount.
  const renderRow = (item: CartItem, count: number) => {
    const rowKey = `${count}:${item.id}`
    return (
      <CartLineContext.Provider key={rowKey} value={item}>
        {/* Row wrapper — the CSS below forces the Cart Item's own root element to
            fill this wrapper, overriding Framer's baked-in fixed width. */}
        <div className={fill ? "decant-cpl-fill" : undefined} style={{ width: fill ? "100%" : "auto" }}>
          {makeRow(
            cartListItem,
            {
              lineId: item.id,
              title: item.title ?? "",
              image: item.image ?? "",
              price: item.price ?? 0,
              quantity: item.quantity,
            },
            rowKey
          )}
        </div>
      </CartLineContext.Provider>
    )
  }

  const wrap = (children: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap, width: "100%", padding, boxSizing: "border-box", ...scrollStyle, ...style }}>
      {fill && (
        <style>{`.decant-cpl-fill > * { width: 100% !important; max-width: 100% !important; }`}</style>
      )}
      {children}
    </div>
  )

  // Canvas, no template — placeholder hints
  if (onCanvas && !hasTemplate) {
    return wrap(
      [1, 2].map((n) => (
        <div
          key={n}
          style={{
            height: 80,
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
          Connect a Cart List Item component →
        </div>
      ))
    )
  }

  // Canvas, template connected — preview rows with placeholder data
  if (onCanvas && hasTemplate) {
    return wrap(CANVAS_PREVIEWS.map((it) => renderRow(it, CANVAS_PREVIEWS.length)))
  }

  // Preview / published — empty cart
  if (items.length === 0) {
    const content = isRenderable(emptyState) ? (
      <>{emptyState as React.ReactNode}</>
    ) : (
      <span style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, color: "#999" }}>
        {emptyLabel}
      </span>
    )
    // Fill the available space and center (or align) the empty content within it.
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: alignXMap[emptyAlignX ?? "center"],
          justifyContent: alignYMap[emptyAlignY ?? "center"],
          width: "100%",
          height: "100%",
          flex: scroll ? 1 : undefined,
          minHeight: scroll ? 0 : undefined,
          padding,
          boxSizing: "border-box",
          ...style,
        }}
      >
        {content}
      </div>
    )
  }

  // Real items, no template — minimal fallback
  if (!hasTemplate) {
    return wrap(
      items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: "12px 0",
            borderBottom: "1px solid #eee",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 13,
            color: "#1a1a1a",
          }}
        >
          {item.title ?? item.id}
        </div>
      ))
    )
  }

  // Real items with template
  return wrap(items.map((it) => renderRow(it, items.length)))
}

CartProductList.defaultProps = {
  gap: 16,
  itemWidth: "fill",
  scroll: true,
  padding: "0px",
  emptyLabel: "Your cart is empty",
  emptyAlignX: "center",
  emptyAlignY: "center",
}

addPropertyControls(CartProductList, {
  cartListItem: {
    type: ControlType.ComponentInstance,
    title: "Cart List Item",
  },
  emptyState: {
    type: ControlType.ComponentInstance,
    title: "Empty State",
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 0,
    max: 64,
    defaultValue: 16,
  },
  itemWidth: {
    type: ControlType.Enum,
    title: "Item width",
    options: ["fill", "auto"],
    optionTitles: ["Fill", "Auto"],
    defaultValue: "fill",
    displaySegmentedControl: true,
    description: "Fill stretches each row to the list width.",
  },
  scroll: {
    type: ControlType.Boolean,
    title: "Scroll",
    defaultValue: true,
    description: "List fills remaining height and scrolls; header/footer stay fixed.",
  },
  padding: {
    type: ControlType.Padding,
    title: "Padding",
    defaultValue: "0px",
    description: "Inside the scroll area, so the scrollbar sits at the edge.",
  },
  emptyLabel: {
    type: ControlType.String,
    title: "Empty label",
    defaultValue: "Your cart is empty",
    hidden: (props) => isRenderable(props.emptyState),
  },
  emptyAlignX: {
    type: ControlType.Enum,
    title: "Empty align X",
    options: ["left", "center", "right"],
    optionTitles: ["Left", "Center", "Right"],
    defaultValue: "center",
    displaySegmentedControl: true,
  },
  emptyAlignY: {
    type: ControlType.Enum,
    title: "Empty align Y",
    options: ["top", "center", "bottom"],
    optionTitles: ["Top", "Center", "Bottom"],
    defaultValue: "center",
    displaySegmentedControl: true,
  },
})
