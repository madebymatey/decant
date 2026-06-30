import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef, useState } from "react"
import { clearCart, completeOrder, useGlobalConfig } from "./decant.ts"

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
 * On load it reads the order id from `?oid=` and marks the server cart COMPLETED
 * (a conversion — so it isn't tracked as abandoned), then clears the local cart.
 * Falls back to a plain local clear if there's no order id / base URL.
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
  const config = useGlobalConfig()
  const [oid, setOid] = useState<string | null>(null)
  const firedRef = useRef(false)

  // Finalize exactly once: mark the server cart completed (conversion) for a real
  // order id, else just clear locally. completeOrder reads the live baseUrl itself.
  const finalize = () => {
    if (firedRef.current) return
    firedRef.current = true
    const orderId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("oid")
        : null
    if (orderId) void completeOrder(orderId)
    else clearCart()
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOid(new URLSearchParams(window.location.search).get("oid"))
    }
    // Fallback so the cart still clears even if DecantConfig never sets a baseUrl.
    const t = setTimeout(finalize, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefer to finalize as soon as the base URL is known (so the /complete call works).
  useEffect(() => {
    if (config.baseUrl) finalize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.baseUrl])

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
