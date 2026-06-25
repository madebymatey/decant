// CartBadge.tsx — shows the current (local) cart count + total. Updates live as
// ProductCard "Add to cart" buttons are clicked anywhere on the page.

import { addPropertyControls, ControlType } from "framer"
import { useCart } from "./decant"

type CartBadgeProps = {
  label: string
  currency: string
  accent: string
}

export function CartBadge(props: CartBadgeProps) {
  const { label, currency, accent } = props
  const { count, total } = useCart()

  const totalText = (() => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(total)
    } catch {
      return `${total.toFixed(2)} ${currency}`
    }
  })()

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: accent,
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.85 }}>
        {count} · {totalText}
      </span>
    </div>
  )
}

CartBadge.defaultProps = {
  label: "Cart",
  currency: "AUD",
  accent: "#7b1e3b",
}

addPropertyControls(CartBadge, {
  label: { type: ControlType.String, title: "Label", defaultValue: "Cart" },
  currency: { type: ControlType.String, title: "Currency", defaultValue: "AUD" },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#7b1e3b" },
})
