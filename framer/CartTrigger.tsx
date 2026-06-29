// CartTrigger.tsx — the cart open button + the overlay it reveals.
// Connect your cart design to the "Cart Layer" slot; it shows as a fixed overlay
// when the trigger is clicked. This is the only component you need to drop —
// bundle it inside your own Cart component and you're done.

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useCart, useCartDrawer, toggleCart, closeCart } from "./decant.ts"

interface CartLayerConfig {
  height?: "viewport" | "default"
  position?: "topRight" | "topLeft"
  offsetX?: number
  offsetY?: number
}

interface OverlayConfig {
  background?: string
  blur?: number
}

interface Props {
  cartLayer?: React.ReactNode
  cartLayerConfig?: CartLayerConfig
  overlay?: OverlayConfig
  children?: React.ReactNode
  showBadge?: boolean
  accent?: string
  badgeSize?: number
  style?: React.CSSProperties
}

export function CartTrigger({
  cartLayer,
  cartLayerConfig = {},
  overlay = {},
  children,
  showBadge,
  accent,
  badgeSize,
  style,
}: Props) {
  const { count } = useCart()
  const { open } = useCartDrawer()
  const onCanvas = RenderTarget.current() === RenderTarget.canvas

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Lock page scroll while the cart is open (skip in the canvas editor).
  // Preserves the scrollbar gutter so the page doesn't shift when it locks.
  useEffect(() => {
    if (onCanvas || typeof document === "undefined") return
    if (!open) return
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
    }
  }, [open, onCanvas])

  const {
    height = "viewport",
    position = "topRight",
    offsetX = 0,
    offsetY = 0,
  } = cartLayerConfig

  const {
    background = "rgba(0,0,0,0.45)",
    blur = 0,
  } = overlay

  const isLeft = position === "topLeft"

  return (
    <>
      {/* Trigger button */}
      <div
        style={{ position: "relative", display: "inline-flex", cursor: "pointer", ...style }}
        onClick={toggleCart}
      >
        {children ?? <BagIcon color={accent ?? "#7b1e3b"} />}

        {showBadge && count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: badgeSize,
              height: badgeSize,
              borderRadius: 999,
              background: accent,
              color: "#fff",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: Math.round((badgeSize ?? 18) * 0.55),
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>

      {/* Overlay — portal to body so position:fixed escapes Framer's transforms.
          Only in preview/published, never in the canvas editor. */}
      {open && !onCanvas && mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                background,
                backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
                WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
                zIndex: 9998,
              }}
              onClick={closeCart}
            />

            {/* Cart Layer — render the ComponentInstance node DIRECTLY ({cartLayer}),
                never via React.createElement (that throws React #130).
                The panel is a bounded-height box that does NOT scroll itself; the
                injected CSS forces the cart layer to fill it, so a scrollable
                CartProductList inside can scroll while header/footer stay fixed. */}
            <div
              className="decant-cart-panel"
              style={{
                position: "fixed",
                top: offsetY,
                [isLeft ? "left" : "right"]: offsetX,
                bottom: 0,
                zIndex: 9999,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <style>{`.decant-cart-panel > * { width: 100% !important; height: 100% !important; }`}</style>
              {cartLayer}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

function BagIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

CartTrigger.defaultProps = {
  cartLayerConfig: { height: "viewport", position: "topRight", offsetX: 0, offsetY: 0 },
  overlay: { background: "rgba(0,0,0,0.45)", blur: 0 },
  showBadge: true,
  accent: "#7b1e3b",
  badgeSize: 18,
}

addPropertyControls(CartTrigger, {
  cartLayer: {
    type: ControlType.ComponentInstance,
    title: "Cart Layer",
    description: "Connect your cart design component. Must be a component, not a stack.",
  },
  cartLayerConfig: {
    type: ControlType.Object,
    title: "Cart Layer Config",
    controls: {
      height: {
        type: ControlType.Enum,
        title: "Height",
        options: ["viewport", "default"],
        optionTitles: ["Viewport", "Default"],
        defaultValue: "viewport",
      },
      position: {
        type: ControlType.Enum,
        title: "Position",
        options: ["topRight", "topLeft"],
        optionTitles: ["Top Right", "Top Left"],
        defaultValue: "topRight",
      },
      offsetX: { type: ControlType.Number, title: "Offset X", defaultValue: 0 },
      offsetY: { type: ControlType.Number, title: "Offset Y", defaultValue: 0 },
    },
  },
  overlay: {
    type: ControlType.Object,
    title: "Overlay",
    controls: {
      background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(0,0,0,0.45)",
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 40,
        defaultValue: 0,
        description: "Backdrop blur behind the overlay.",
      },
    },
  },
  children: {
    type: ControlType.ComponentInstance,
    title: "Button",
  },
  showBadge: {
    type: ControlType.Boolean,
    title: "Show badge",
    defaultValue: true,
    hidden: (props) => !!props.children,
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.children,
  },
  badgeSize: {
    type: ControlType.Number,
    title: "Badge size",
    min: 12,
    max: 28,
    defaultValue: 18,
    hidden: (props) => !!props.children || !props.showBadge,
  },
})
