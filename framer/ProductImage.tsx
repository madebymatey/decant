// ProductImage.tsx — product image for a card inside ProductList. Reads the
// card's product from context automatically (no wiring). Use this instead of a
// native Image layer, since ProductList passes the image as a URL string which
// native image-variable bindings don't accept.

import { addPropertyControls, ControlType } from "framer"
import { useProductCard } from "./decant.ts"

type SizeMode = "fill" | "fixed"
type HeightMode = "fill" | "fixed" | "aspect"
type ObjectFit = "cover" | "contain" | "fill" | "none"

const PLACEHOLDER = "https://picsum.photos/seed/decant-wine/600/750"

interface Props {
  imageUrl?: string
  alt?: string
  showPlaceholder?: boolean
  placeholderUrl?: string
  fit?: ObjectFit
  widthMode?: SizeMode
  width?: number
  heightMode?: HeightMode
  height?: number
  aspectRatio?: number
  borderRadius?: number
  background?: string
  style?: React.CSSProperties
}

export function ProductImage({
  imageUrl,
  alt,
  showPlaceholder,
  placeholderUrl,
  fit,
  widthMode,
  width,
  heightMode,
  height,
  aspectRatio,
  borderRadius,
  background,
  style,
}: Props) {
  const product = useProductCard()
  const placeholder = showPlaceholder ? (placeholderUrl || PLACEHOLDER) : ""
  const resolvedUrl = imageUrl || product?.image || product?.images?.[0] || placeholder
  const resolvedAlt = alt || product?.title || ""

  const boxStyle: React.CSSProperties = {
    width: widthMode === "fixed" ? width : "100%",
    height: heightMode === "fixed" ? height : heightMode === "aspect" ? undefined : "100%",
    aspectRatio: heightMode === "aspect" ? String(aspectRatio) : undefined,
    borderRadius,
    background,
    overflow: "hidden",
    flexShrink: 0,
    ...style,
  }

  return (
    <div style={boxStyle}>
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={resolvedAlt}
          style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#f0f0f0" }} />
      )}
    </div>
  )
}

ProductImage.defaultProps = {
  alt: "",
  showPlaceholder: true,
  fit: "cover",
  widthMode: "fill",
  width: 200,
  heightMode: "aspect",
  height: 240,
  aspectRatio: 0.8,
  borderRadius: 8,
  background: "#f4f4f4",
}

addPropertyControls(ProductImage, {
  imageUrl: {
    type: ControlType.String,
    title: "Image URL",
    description: "Leave blank to use the product's image automatically.",
  },
  alt: { type: ControlType.String, title: "Alt text" },
  showPlaceholder: {
    type: ControlType.Boolean,
    title: "Placeholder",
    defaultValue: true,
  },
  placeholderUrl: {
    type: ControlType.String,
    title: "Placeholder URL",
    placeholder: "Built-in if blank",
    hidden: (props) => !props.showPlaceholder,
  },
  fit: {
    type: ControlType.Enum,
    title: "Image fit",
    options: ["cover", "contain", "fill", "none"],
    optionTitles: ["Fill (crop)", "Fit", "Stretch", "Original"],
    defaultValue: "cover",
  },
  widthMode: {
    type: ControlType.Enum,
    title: "Width",
    options: ["fill", "fixed"],
    optionTitles: ["Fill", "Fixed"],
    defaultValue: "fill",
    displaySegmentedControl: true,
  },
  width: {
    type: ControlType.Number,
    title: "Width px",
    min: 40,
    max: 800,
    defaultValue: 200,
    hidden: (props) => props.widthMode !== "fixed",
  },
  heightMode: {
    type: ControlType.Enum,
    title: "Height",
    options: ["fill", "fixed", "aspect"],
    optionTitles: ["Fill", "Fixed", "Ratio"],
    defaultValue: "aspect",
    displaySegmentedControl: true,
  },
  height: {
    type: ControlType.Number,
    title: "Height px",
    min: 40,
    max: 800,
    defaultValue: 240,
    hidden: (props) => props.heightMode !== "fixed",
  },
  aspectRatio: {
    type: ControlType.Number,
    title: "Ratio (w/h)",
    min: 0.25,
    max: 4,
    step: 0.05,
    defaultValue: 0.8,
    hidden: (props) => props.heightMode !== "aspect",
  },
  borderRadius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 48,
    defaultValue: 8,
  },
  background: {
    type: ControlType.Color,
    title: "Background",
    defaultValue: "#f4f4f4",
  },
})
