// CartPanel.tsx — handles the cart overlay. Drop inside your Cart component
// alongside CartTrigger, then place your cart design (CartLayer) inside CartPanel
// in Framer's editor.
//
// Uses a React portal to render the overlay directly on document.body, which
// escapes Framer's CSS transform positioning so position:fixed covers the
// full viewport regardless of where CartPanel sits in the component tree.

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useCartDrawer, closeCart } from "./decant.ts"

interface Props {
  children?: React.ReactNode
  side?: "right" | "left"
  width?: number
  backdropColor?: string
  style?: React.CSSProperties
}

export function CartPanel({ children, side, width, backdropColor, style }: Props) {
  const { open } = useCartDrawer()
  const onCanvas = RenderTarget.current() === RenderTarget.canvas

  // Track client-side mount so we only portal after hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Canvas — invisible so it doesn't interfere with page layout.
  // CartLayer inside it is edited as its own component from the components panel.
  if (onCanvas) {
    return (
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        {children}
      </div>
    )
  }

  if (!open || !mounted) return null

  // Render via portal directly on document.body to escape any CSS transform
  // ancestor that would break position:fixed containment
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: backdropColor,
          zIndex: 9998,
        }}
        onClick={closeCart}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          [side === "left" ? "left" : "right"]: 0,
          bottom: 0,
          width,
          zIndex: 9999,
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}

CartPanel.defaultProps = {
  side: "right",
  width: 420,
  backdropColor: "rgba(0,0,0,0.45)",
}

addPropertyControls(CartPanel, {
  side: {
    type: ControlType.Enum,
    title: "Side",
    options: ["right", "left"],
    optionTitles: ["Right", "Left"],
    defaultValue: "right",
  },
  width: {
    type: ControlType.Number,
    title: "Width",
    min: 240,
    max: 800,
    defaultValue: 420,
  },
  backdropColor: {
    type: ControlType.Color,
    title: "Backdrop",
    defaultValue: "rgba(0,0,0,0.45)",
  },
})
