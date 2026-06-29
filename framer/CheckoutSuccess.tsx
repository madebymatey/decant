import { addPropertyControls, ControlType } from "framer"
import { useEffect, useState } from "react"
import { clearCart } from "./decant.ts"

interface Props {
  children?: React.ReactNode
  heading?: string
  message?: string
  showOrderId?: boolean
  orderLabel?: string
  accent?: string
  style?: React.CSSProperties
}

/**
 * Drop this on the WithWine CheckoutSuccess page (/CheckoutSuccess?oid=...).
 *
 * On load it CLEARS the site cart — WithWine owns the order from here, and the
 * redirect back doesn't otherwise touch the localStorage cart. It also reads the
 * order id from the `?oid=` query param (no API call needed).
 *
 * Slot your own design into Children for a fully custom page; the cart still
 * clears either way.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export function CheckoutSuccess({
  children,
  heading,
  message,
  showOrderId,
  orderLabel,
  accent,
  style,
}: Props) {
  const [oid, setOid] = useState<string | null>(null)

  useEffect(() => {
    clearCart()
    if (typeof window !== "undefined") {
      setOid(new URLSearchParams(window.location.search).get("oid"))
    }
  }, [])

  // Custom design slotted in — just clear the cart and render it.
  if (children) return <>{children}</>

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 8,
        padding: 32,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
        ...style,
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1 }}>🍷</div>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>
        {heading}
      </h1>
      <p style={{ margin: 0, fontSize: 15, color: "#555", maxWidth: 420 }}>
        {message}
      </p>
      {showOrderId && oid && (
        <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#888" }}>
          {orderLabel} <strong style={{ color: "#333" }}>{oid}</strong>
        </p>
      )}
    </div>
  )
}

CheckoutSuccess.defaultProps = {
  heading: "Thank you for your order",
  message: "Your order has been placed. A confirmation email is on its way.",
  showOrderId: true,
  orderLabel: "Order #",
  accent: "#7b1e3b",
}

addPropertyControls(CheckoutSuccess, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
    description: "Optional custom layout. The cart still clears on load.",
  },
  heading: {
    type: ControlType.String,
    title: "Heading",
    defaultValue: "Thank you for your order",
    hidden: (props) => !!props.children,
  },
  message: {
    type: ControlType.String,
    title: "Message",
    displayTextArea: true,
    defaultValue: "Your order has been placed. A confirmation email is on its way.",
    hidden: (props) => !!props.children,
  },
  showOrderId: {
    type: ControlType.Boolean,
    title: "Show Order ID",
    defaultValue: true,
    hidden: (props) => !!props.children,
  },
  orderLabel: {
    type: ControlType.String,
    title: "Order Label",
    defaultValue: "Order #",
    hidden: (props) => !!props.children || !props.showOrderId,
  },
  accent: {
    type: ControlType.Color,
    title: "Accent",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.children,
  },
})
