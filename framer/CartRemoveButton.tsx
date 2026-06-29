// CartRemoveButton.tsx — removes a single cart line on click.
// Place inside your Cart List Item design component and connect Line Id
// to the parent's lineId variable.

import { addPropertyControls, ControlType } from "framer"
import { useCart, useCartLine } from "./decant.ts"

interface Props {
  lineId?: string
  children?: React.ReactNode
  accent?: string
  size?: number
  radius?: number
  style?: React.CSSProperties
}

export function CartRemoveButton({ lineId, children, accent, size, radius, style }: Props) {
  const { removeFromCart } = useCart()
  const line = useCartLine()
  const resolvedId = lineId || line?.id || ""
  const handleClick = () => { if (resolvedId) removeFromCart(resolvedId) }

  if (children) {
    return (
      <div style={{ display: "contents", cursor: "pointer" }} onClick={handleClick}>
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        border: "none",
        background: "none",
        color: accent,
        fontSize: 14,
        cursor: "pointer",
        padding: 0,
        lineHeight: 1,
        fontFamily: "Inter, system-ui, sans-serif",
        ...style,
      }}
    >
      ✕
    </button>
  )
}

CartRemoveButton.defaultProps = {
  lineId: "",
  accent: "#aaa",
  size: 24,
  radius: 4,
}

addPropertyControls(CartRemoveButton, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
  },
  lineId: {
    type: ControlType.String,
    title: "Line Id",
    description: "Connect to the lineId variable from your Cart List Item component.",
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#aaa",
    hidden: (props) => !!props.children,
  },
  size: {
    type: ControlType.Number,
    title: "Size",
    min: 16,
    max: 56,
    defaultValue: 24,
    hidden: (props) => !!props.children,
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 28,
    defaultValue: 4,
    hidden: (props) => !!props.children,
  },
})
