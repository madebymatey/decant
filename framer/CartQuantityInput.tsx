// CartQuantityInput.tsx — a single quantity control. Set Type to choose
// whether this instance is a decrement button, the quantity display/input,
// or an increment button. Drop three of these into your Cart List Item layout.

import { addPropertyControls, ControlType } from "framer"
import { useState, useEffect } from "react"
import { useCart, useCartLine } from "./decant.ts"

type InputType = "decrement" | "display" | "increment"
type ButtonMode = "preset" | "custom"

interface InputStyle {
  color?: string
  background?: string
  padding?: string
  border?: boolean
  borderColor?: string
  radius?: number
}

interface Props {
  type?: InputType
  lineId?: string
  quantity?: number
  step?: number
  min?: number
  max?: number
  // Button (decrement / increment)
  buttonMode?: ButtonMode
  buttonDesign?: unknown
  accent?: string
  radius?: number
  buttonSize?: number
  // Display / input
  font?: React.CSSProperties
  textAlign?: "left" | "center" | "right"
  inputStyle?: InputStyle
  placeholder?: string
  // Shared
  disabled?: boolean
  style?: React.CSSProperties
}

// Framer passes a connected ComponentInstance as a (possibly array-wrapped) node,
// never a plain function — so render it directly, don't call it as a component.
function isRenderable(node: unknown): boolean {
  if (node == null) return false
  if (Array.isArray(node)) return node.some(isRenderable)
  return true
}

export function CartQuantityInput({
  type = "display",
  lineId,
  quantity: quantityProp = 1,
  step = 1,
  min = 1,
  max = 99,
  buttonMode = "preset",
  buttonDesign,
  accent = "#7b1e3b",
  radius = 6,
  buttonSize = 28,
  font,
  textAlign = "center",
  inputStyle = {},
  placeholder = "",
  disabled = false,
  style,
}: Props) {
  const { items, setQuantity } = useCart()
  const line = useCartLine()
  const resolvedItem = (lineId ? items.find((i) => String(i.id) === String(lineId)) : null) ?? line
  const resolvedId = resolvedItem?.id ?? lineId ?? ""
  const qty = resolvedItem?.quantity ?? quantityProp

  const decrement = () => {
    if (!resolvedId || disabled) return
    setQuantity(resolvedId, Math.max(min, qty - step))
  }

  const increment = () => {
    if (!resolvedId || disabled) return
    setQuantity(resolvedId, Math.min(max, qty + step))
  }

  // Local draft so the user can clear the field and type freely; the cart only
  // commits valid in-range numbers, and the field clamps/reverts on blur.
  const [draft, setDraft] = useState(String(qty))
  useEffect(() => { setDraft(String(qty)) }, [qty])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    if (!resolvedId || disabled) return
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= min && n <= max) setQuantity(resolvedId, n)
  }

  const handleInputBlur = () => {
    const n = parseInt(draft, 10)
    if (isNaN(n)) { setDraft(String(qty)); return }
    const clamped = Math.min(max, Math.max(min, n))
    setDraft(String(clamped))
    if (resolvedId && !disabled) setQuantity(resolvedId, clamped)
  }

  const useCustom = buttonMode === "custom" && isRenderable(buttonDesign)

  // ── Decrement / Increment buttons ─────────────────────────────────────────
  if (type === "decrement" || type === "increment") {
    const onClick = type === "decrement" ? decrement : increment

    // Custom: render the connected Framer design directly, click handled by wrapper
    if (useCustom) {
      return (
        <div
          onClick={onClick}
          style={{
            display: "inline-flex",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            ...style,
          }}
        >
          {buttonDesign as React.ReactNode}
        </div>
      )
    }

    // Preset button
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ ...presetBtnStyle(accent, radius, buttonSize), ...style }}
      >
        {type === "decrement" ? "−" : "+"}
      </button>
    )
  }

  // ── Display / input ───────────────────────────────────────────────────────
  const s = inputStyle
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "stretch", ...style }}>
      <style>{`
        .decant-qty-input::-webkit-outer-spin-button,
        .decant-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .decant-qty-input { -moz-appearance: textfield; appearance: textfield; }
      `}</style>
      <input
        className="decant-qty-input"
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled || !resolvedId}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={(e) => e.target.select()}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          minWidth: 0,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          ...font,
          textAlign,
          color: s.color ?? "#1a1a1a",
          border: (s.border ?? true) ? `1px solid ${s.borderColor ?? "#ddd"}` : "none",
          borderRadius: s.radius ?? 6,
          padding: s.padding ?? "0px",
          background: s.background ?? "transparent",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  )
}

function presetBtnStyle(accent: string, radius: number, size: number): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: radius,
    border: `1.5px solid ${accent}`,
    background: "transparent",
    color: accent,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
    fontFamily: "Inter, system-ui, sans-serif",
  }
}

CartQuantityInput.defaultProps = {
  type: "display",
  quantity: 1,
  step: 1,
  min: 1,
  max: 99,
  buttonMode: "preset",
  accent: "#7b1e3b",
  radius: 6,
  buttonSize: 28,
  placeholder: "",
  disabled: false,
}

const isButton = (props: any) => props.type === "decrement" || props.type === "increment"
const isDisplay = (props: any) => props.type === "display"
const isCustom = (props: any) => isButton(props) && props.buttonMode === "custom"
const isPreset = (props: any) => isButton(props) && props.buttonMode !== "custom"

addPropertyControls(CartQuantityInput, {
  type: {
    type: ControlType.Enum,
    title: "Type",
    options: ["decrement", "display", "increment"],
    optionTitles: ["−", "123", "+"],
    defaultValue: "display",
  },
  quantity: {
    type: ControlType.Number,
    title: "Quantity",
    min: 0,
    defaultValue: 1,
    description: "Connect to a Quantity variable from Cart List Item component.",
  },
  lineId: {
    type: ControlType.String,
    title: "Line Id",
    description: "Connect to the Line Id variable from Cart List Item component.",
  },
  step: {
    type: ControlType.Number,
    title: "Step",
    min: 1,
    defaultValue: 1,
  },
  min: {
    type: ControlType.Number,
    title: "Min",
    min: 0,
    defaultValue: 1,
  },
  max: {
    type: ControlType.Number,
    title: "Max",
    defaultValue: 99,
  },
  buttonMode: {
    type: ControlType.Enum,
    title: "Button Type",
    options: ["preset", "custom"],
    optionTitles: ["Preset", "Custom"],
    defaultValue: "preset",
    hidden: isDisplay,
  },
  buttonDesign: {
    type: ControlType.ComponentInstance,
    title: "Button Design",
    hidden: (props) => !isCustom(props),
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#7b1e3b",
    hidden: (props) => !isPreset(props),
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 24,
    defaultValue: 6,
    hidden: (props) => !isPreset(props),
  },
  buttonSize: {
    type: ControlType.Number,
    title: "Button size",
    min: 20,
    max: 56,
    defaultValue: 28,
    hidden: (props) => !isPreset(props),
  },
  font: {
    type: ControlType.Font,
    title: "Font",
    controls: "extended",
    defaultFontType: "sans-serif",
    defaultValue: { fontSize: 14, variant: "Semibold" },
    hidden: isButton,
  },
  textAlign: {
    type: ControlType.Enum,
    title: "Align",
    options: ["left", "center", "right"],
    optionTitles: ["Left", "Center", "Right"],
    defaultValue: "center",
    displaySegmentedControl: true,
    hidden: isButton,
  },
  inputStyle: {
    type: ControlType.Object,
    title: "Input Style",
    hidden: isButton,
    controls: {
      color: { type: ControlType.Color, title: "Text", defaultValue: "#1a1a1a" },
      background: { type: ControlType.Color, title: "Background", defaultValue: "rgba(0,0,0,0)" },
      padding: { type: ControlType.Padding, title: "Padding", defaultValue: "0px" },
      border: { type: ControlType.Boolean, title: "Border", defaultValue: true },
      borderColor: { type: ControlType.Color, title: "Border color", defaultValue: "#ddd" },
      radius: { type: ControlType.Number, title: "Radius", min: 0, max: 24, defaultValue: 6 },
    },
  },
  placeholder: {
    type: ControlType.String,
    title: "Placeholder",
    defaultValue: "",
    hidden: isButton,
  },
  disabled: {
    type: ControlType.Boolean,
    title: "Disabled",
    defaultValue: false,
  },
})
