// CartInfoLabel.tsx — displays a reactive cart value: subtotal, total, or item count.
// Use anywhere on the page — in a nav bar, cart panel header, checkout footer, etc.

import { addPropertyControls, ControlType } from "framer"
import { useEffect, useState } from "react"
import { useCart, useGlobalConfig } from "./decant.ts"

type LabelType = "subtotal" | "total" | "itemCount"
type WhenZero = "show" | "hide"
type Tag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4"

interface Props {
  type?: LabelType
  currencyCode?: string
  whenZero?: WhenZero
  tag?: Tag
  font?: React.CSSProperties
  color?: string
  textAlign?: "left" | "center" | "right"
  showLoader?: boolean
  loaderColor?: string
  loaderSize?: "sm" | "md" | "lg"
  style?: React.CSSProperties
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const loaderSizeMap = { sm: "60px", md: "100px", lg: "140px" }

export function CartInfoLabel({
  type,
  currencyCode,
  whenZero,
  tag: Tag = "span",
  font,
  color,
  textAlign,
  showLoader,
  loaderColor,
  loaderSize,
  style,
}: Props) {
  const config = useGlobalConfig()
  const { count, total } = useCart()
  const resolvedCurrency = currencyCode || config.currency

  // Brief loading state on first mount so the loader style has a chance to show
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  const value = type === "itemCount" ? count : total
  const displayText =
    type === "itemCount"
      ? String(count)
      : formatCurrency(total, resolvedCurrency)

  if (whenZero === "hide" && value === 0) return null

  if (showLoader && !ready) {
    const w = loaderSizeMap[loaderSize ?? "md"]
    const loaderHeight = (font?.fontSize as number) ? (font!.fontSize as number) * 1.2 : 18
    return (
      <span
        style={{
          display: "inline-block",
          width: w,
          height: loaderHeight,
          borderRadius: 4,
          background: loaderColor,
          animation: "decant-pulse 1.4s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes decant-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }
        `}</style>
      </span>
    )
  }

  return (
    <Tag
      style={{
        display: "block",
        ...font,
        color,
        textAlign,
        margin: 0,
        ...style,
      }}
    >
      {displayText}
    </Tag>
  )
}

CartInfoLabel.defaultProps = {
  type: "subtotal",
  whenZero: "show",
  tag: "span",
  color: "#1a1a1a",
  textAlign: "left",
  showLoader: false,
  loaderColor: "#e0e0e0",
  loaderSize: "md",
}

addPropertyControls(CartInfoLabel, {
  type: {
    type: ControlType.Enum,
    title: "Type",
    options: ["subtotal", "total", "itemCount"],
    optionTitles: ["Subtotal", "Total", "Item Count"],
    defaultValue: "subtotal",
  },
  currencyCode: {
    type: ControlType.String,
    title: "Currency Code",
    placeholder: "Uses DecantConfig if blank",
    hidden: (props) => props.type === "itemCount",
  },
  whenZero: {
    type: ControlType.Enum,
    title: "When Zero",
    options: ["show", "hide"],
    optionTitles: ["Show", "Hide"],
    defaultValue: "show",
    description: "Hides the component when the value is 0.",
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
  showLoader: {
    type: ControlType.Boolean,
    title: "Loader",
    defaultValue: false,
    description: "Pulsing placeholder shown on first render before cart state loads.",
  },
  loaderColor: {
    type: ControlType.Color,
    title: "Loader color",
    defaultValue: "#e0e0e0",
    hidden: (props) => !props.showLoader,
  },
  loaderSize: {
    type: ControlType.Enum,
    title: "Loader size",
    options: ["sm", "md", "lg"],
    optionTitles: ["Small", "Medium", "Large"],
    defaultValue: "md",
    hidden: (props) => !props.showLoader,
  },
})
