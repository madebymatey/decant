// CartCloseButton.tsx — drop this anywhere inside your cart shell design.
// Wraps your designed close button and calls closeCart() on click.
// Pair with CartPanel + CartTrigger.

import { addPropertyControls, ControlType } from "framer"
import { closeCart } from "./decant.ts"

interface Props {
  children?: React.ReactNode
  accent?: string
  size?: number
  radius?: number
  style?: React.CSSProperties
}

export function CartCloseButton({ children, accent, size, radius, style }: Props) {
  if (children) {
    return (
      <div style={{ display: "contents", cursor: "pointer" }} onClick={closeCart}>
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={closeCart}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        border: "none",
        background: "#f4f4f4",
        color: accent,
        fontSize: 16,
        cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
        ...style,
      }}
    >
      ✕
    </button>
  )
}

CartCloseButton.defaultProps = {
  accent: "#1a1a1a",
  size: 32,
  radius: 6,
}

addPropertyControls(CartCloseButton, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#1a1a1a",
    hidden: (props) => !!props.children,
  },
  size: {
    type: ControlType.Number,
    title: "Size",
    min: 20,
    max: 64,
    defaultValue: 32,
    hidden: (props) => !!props.children,
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 32,
    defaultValue: 6,
    hidden: (props) => !!props.children,
  },
})
