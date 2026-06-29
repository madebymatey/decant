// CheckoutButton.tsx — standalone checkout trigger. Use inside a custom cart
// design, or drop standalone. Slots a designed button or renders its own.
// On click: calls POST /api/checkout on the middleware, then redirects to
// WithWine's hosted checkout. WithWine handles payment/tax/shipping.

import { addPropertyControls, ControlType } from "framer"
import { useState, useCallback } from "react"
import { useCart } from "./decant.ts"

interface Props {
  children?: React.ReactNode
  baseUrl?: string
  country?: string
  postcode?: string
  label?: string
  loadingLabel?: string
  disabledLabel?: string
  accent?: string
  radius?: number
  style?: React.CSSProperties
}

export function CheckoutButton({
  children,
  baseUrl,
  country,
  postcode,
  label,
  loadingLabel,
  disabledLabel,
  accent,
  radius,
  style,
}: Props) {
  const [loading, setLoading] = useState(false)
  const { items, checkout } = useCart(baseUrl)
  const empty = items.length === 0

  const handleClick = useCallback(async () => {
    if (empty || loading) return
    setLoading(true)
    try {
      await checkout({ country, postcode })
    } catch (e) {
      console.error("checkout error", e)
      setLoading(false)
    }
  }, [empty, loading, checkout, country, postcode])

  const buttonLabel = empty ? disabledLabel : loading ? loadingLabel : label

  if (children) {
    // The injected CSS forces the slotted design's own root element to fill this
    // wrapper, overriding Framer's baked-in fixed size (same trick as the cart list).
    return (
      <div
        className="decant-checkout-fill"
        style={{
          width: "100%",
          cursor: empty ? "not-allowed" : "pointer",
          opacity: empty ? 0.5 : 1,
        }}
        onClick={handleClick}
      >
        <style>{`.decant-checkout-fill > * { width: 100% !important; max-width: 100% !important; }`}</style>
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={empty || loading}
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "14px 24px",
        borderRadius: radius,
        border: "none",
        background: empty ? "#ccc" : accent,
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 700,
        cursor: empty || loading ? "not-allowed" : "pointer",
        transition: "background 0.2s, opacity 0.2s",
        opacity: loading ? 0.7 : 1,
        ...style,
      }}
    >
      {buttonLabel}
    </button>
  )
}

CheckoutButton.defaultProps = {
  baseUrl: "",
  country: "",
  postcode: "",
  label: "Checkout",
  loadingLabel: "Redirecting…",
  disabledLabel: "Cart is empty",
  accent: "#7b1e3b",
  radius: 8,
}

addPropertyControls(CheckoutButton, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
  },
  baseUrl: {
    type: ControlType.String,
    title: "Base URL",
    placeholder: "Uses DecantConfig if blank",
  },
  country: {
    type: ControlType.String,
    title: "Country",
    placeholder: "AU",
  },
  postcode: {
    type: ControlType.String,
    title: "Postcode",
    placeholder: "Optional prefill",
  },
  label: {
    type: ControlType.String,
    title: "Label",
    defaultValue: "Checkout",
    hidden: (props) => !!props.children,
  },
  loadingLabel: {
    type: ControlType.String,
    title: "Loading",
    defaultValue: "Redirecting…",
    hidden: (props) => !!props.children,
  },
  disabledLabel: {
    type: ControlType.String,
    title: "Empty",
    defaultValue: "Cart is empty",
    hidden: (props) => !!props.children,
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.children,
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 32,
    defaultValue: 8,
    hidden: (props) => !!props.children,
  },
})
