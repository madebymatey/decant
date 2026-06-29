// ProductText.tsx — displays a single product field (title, price, wine type, …)
// for a card inside ProductList. Reads the card's product from context, so it
// populates automatically — no variables, no wiring. Use these instead of native
// text layers bound to variables (Framer doesn't pass code data into variables).

import { addPropertyControls, ControlType } from "framer"
import { useProductCard } from "./decant.ts"

type Field = "title" | "priceLabel" | "wineType" | "varietal" | "region" | "description"
type Tag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4"

interface Props {
  field?: Field
  fallback?: string
  tag?: Tag
  font?: React.CSSProperties
  color?: string
  textAlign?: "left" | "center" | "right"
  lineClamp?: number
  style?: React.CSSProperties
}

export function ProductText({
  field = "title",
  fallback,
  tag: Tag = "span",
  font,
  color,
  textAlign,
  lineClamp,
  style,
}: Props) {
  const product = useProductCard()
  const raw = product ? (product as Record<string, unknown>)[field] : undefined
  const text = (raw != null && raw !== "" ? String(raw) : fallback) ?? ""

  const clampStyle: React.CSSProperties =
    lineClamp && lineClamp > 0
      ? { display: "-webkit-box", WebkitLineClamp: lineClamp, WebkitBoxOrient: "vertical", overflow: "hidden" }
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

ProductText.defaultProps = {
  field: "title",
  fallback: "Product",
  tag: "span",
  color: "#1a1a1a",
  textAlign: "left",
  lineClamp: 0,
}

addPropertyControls(ProductText, {
  field: {
    type: ControlType.Enum,
    title: "Field",
    options: ["title", "priceLabel", "wineType", "varietal", "region", "description"],
    optionTitles: ["Title", "Price", "Wine Type", "Varietal", "Region", "Description"],
    defaultValue: "title",
  },
  fallback: {
    type: ControlType.String,
    title: "Fallback",
    defaultValue: "Product",
    description: "Shown when the field is empty (e.g. on the canvas).",
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
    max: 6,
    defaultValue: 0,
    description: "0 = no limit.",
  },
})
