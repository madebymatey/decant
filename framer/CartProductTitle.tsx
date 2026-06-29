// CartProductTitle.tsx — displays the product name for a cart line.
// Place inside your Cart List Item design. Reads the row's item automatically
// via context — no wiring needed. Use this instead of a native text layer bound
// to a variable (Framer doesn't pass row data into those reliably).

import { addPropertyControls, ControlType } from "framer"
import { useCartLine } from "./decant.ts"

type Tag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4"

interface Props {
  fallback?: string
  tag?: Tag
  font?: React.CSSProperties
  color?: string
  textAlign?: "left" | "center" | "right"
  lineClamp?: number
  style?: React.CSSProperties
}

export function CartProductTitle({
  fallback,
  tag: Tag = "span",
  font,
  color,
  textAlign,
  lineClamp,
  style,
}: Props) {
  const line = useCartLine()
  const text = line?.title || fallback || ""

  const clampStyle: React.CSSProperties =
    lineClamp && lineClamp > 0
      ? {
          display: "-webkit-box",
          WebkitLineClamp: lineClamp,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }
      : {}

  return (
    <Tag
      style={{
        display: "block",
        ...font,
        color,
        textAlign,
        margin: 0,
        ...clampStyle,
        ...style,
      }}
    >
      {text}
    </Tag>
  )
}

CartProductTitle.defaultProps = {
  fallback: "Product",
  tag: "span",
  color: "#1a1a1a",
  textAlign: "left",
  lineClamp: 0,
}

addPropertyControls(CartProductTitle, {
  fallback: {
    type: ControlType.String,
    title: "Fallback",
    defaultValue: "Product",
    description: "Shown when there's no title (e.g. on the canvas).",
  },
  tag: {
    type: ControlType.Enum,
    title: "Tag",
    options: ["span", "p", "div", "h1", "h2", "h3", "h4"],
    defaultValue: "span",
  },
  font: {
    type: ControlType.Font,
    title: "Font",
    controls: "extended",
    defaultFontType: "sans-serif",
    defaultValue: { fontSize: 14, variant: "Semibold" },
  },
  color: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#1a1a1a",
  },
  textAlign: {
    type: ControlType.Enum,
    title: "Align",
    options: ["left", "center", "right"],
    optionTitles: ["Left", "Center", "Right"],
    defaultValue: "left",
    displaySegmentedControl: true,
  },
  lineClamp: {
    type: ControlType.Number,
    title: "Max lines",
    min: 0,
    max: 4,
    defaultValue: 0,
    description: "0 = no limit.",
  },
})
