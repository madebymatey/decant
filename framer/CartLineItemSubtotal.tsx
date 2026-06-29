// CartLineItemSubtotal.tsx — displays price × quantity for a single cart line.
// Place inside your Cart List Item design component and connect Line Id
// to the parent's lineId variable.

import { addPropertyControls, ControlType } from "framer"
import { useCart, useGlobalConfig, useCartLine } from "./decant.ts"

interface Props {
  lineId?: string
  currencyCode?: string
  deliveryFrequency?: string
  font?: React.CSSProperties
  color?: string
  textAlign?: "left" | "center" | "right"
  textDecoration?: string
  style?: React.CSSProperties
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function CartLineItemSubtotal({
  lineId,
  currencyCode,
  deliveryFrequency,
  font,
  color,
  textAlign,
  textDecoration,
  style,
}: Props) {
  const config = useGlobalConfig()
  const { items } = useCart()
  const line = useCartLine()
  const resolvedItem = (lineId ? items.find((i) => String(i.id) === String(lineId)) : null) ?? line
  const resolvedCurrency = currencyCode || config.currency

  const subtotal = (resolvedItem?.price ?? 0) * (resolvedItem?.quantity ?? 0)
  const priceText = formatPrice(subtotal, resolvedCurrency)
  const displayText = deliveryFrequency ? `${priceText} ${deliveryFrequency}` : priceText

  return (
    <span
      style={{
        display: "block",
        ...font,
        color,
        textAlign,
        textDecoration,
        ...style,
      }}
    >
      {displayText}
    </span>
  )
}

CartLineItemSubtotal.defaultProps = {
  lineId: "",
  color: "#1a1a1a",
  textAlign: "left",
  textDecoration: "none",
}

addPropertyControls(CartLineItemSubtotal, {
  lineId: {
    type: ControlType.String,
    title: "Line Id",
    description: "Connect to the lineId variable from your Cart List Item component.",
  },
  currencyCode: {
    type: ControlType.String,
    title: "Currency Code",
    placeholder: "Uses DecantConfig if blank",
  },
  deliveryFrequency: {
    type: ControlType.String,
    title: "Delivery Frequency",
    placeholder: "e.g. /month",
    description: "Appended to the price. Connect to a variable for subscription products.",
  },
  font: {
    type: ControlType.Font,
    title: "Font",
    controls: "extended",
    defaultFontType: "sans-serif",
    defaultValue: { fontSize: 13, variant: "Semibold" },
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
  textDecoration: {
    type: ControlType.Enum,
    title: "Decoration",
    options: ["none", "underline", "line-through"],
    optionTitles: ["None", "Underline", "Strikethrough"],
    defaultValue: "none",
  },
})
