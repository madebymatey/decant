// CartProductImage.tsx — displays the product image for a cart line.
// Reads the row's image via context. Place inside your Cart Item design.
// Sizing controls let you decide how the box sizes in its parent and how the
// image fills the box (fit / fill / stretch).

import { addPropertyControls, ControlType } from "framer"
import { useCartLine } from "./decant.ts"

type SizeMode = "fill" | "fixed"
type HeightMode = "fill" | "fixed" | "aspect"
type ObjectFit = "cover" | "contain" | "fill" | "none"

// Built-in placeholder — a real photo (seeded so it's stable) so you can test
// fit/fill/stretch against actual image content before real images are wired.
const PLACEHOLDER_IMAGE = "https://picsum.photos/seed/decant-wine/600/750"

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
  border?: boolean
  borderColor?: string
  style?: React.CSSProperties
}

export function CartProductImage({
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
  border,
  borderColor,
  style,
}: Props) {
  const line = useCartLine()
  const placeholder = showPlaceholder ? (placeholderUrl || PLACEHOLDER_IMAGE) : ""
  const resolvedUrl = imageUrl || line?.image || placeholder
  const resolvedAlt = alt || line?.title || ""

  const boxStyle: React.CSSProperties = {
    width: widthMode === "fixed" ? width : "100%",
    height:
      heightMode === "fixed" ? height : heightMode === "aspect" ? undefined : "100%",
    aspectRatio: heightMode === "aspect" ? String(aspectRatio) : undefined,
    borderRadius,
    background,
    overflow: "hidden",
    border: border ? `1px solid ${borderColor}` : "none",
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

CartProductImage.defaultProps = {
  alt: "",
  showPlaceholder: true,
  fit: "cover",
  widthMode: "fill",
  width: 72,
  heightMode: "fill",
  height: 80,
  aspectRatio: 1,
  borderRadius: 6,
  background: "#f4f4f4",
  border: false,
  borderColor: "#e0e0e0",
}

addPropertyControls(CartProductImage, {
  imageUrl: {
    type: ControlType.String,
    title: "Image URL",
    description: "Leave blank to use the cart item's image automatically.",
  },
  alt: {
    type: ControlType.String,
    title: "Alt text",
  },
  showPlaceholder: {
    type: ControlType.Boolean,
    title: "Placeholder",
    defaultValue: true,
    description: "Show a placeholder image when the item has none (for testing).",
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
    description: "How the image fills the box.",
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
    min: 20,
    max: 400,
    defaultValue: 72,
    hidden: (props) => props.widthMode !== "fixed",
  },
  heightMode: {
    type: ControlType.Enum,
    title: "Height",
    options: ["fill", "fixed", "aspect"],
    optionTitles: ["Fill", "Fixed", "Ratio"],
    defaultValue: "fill",
    displaySegmentedControl: true,
  },
  height: {
    type: ControlType.Number,
    title: "Height px",
    min: 20,
    max: 400,
    defaultValue: 80,
    hidden: (props) => props.heightMode !== "fixed",
  },
  aspectRatio: {
    type: ControlType.Number,
    title: "Ratio (w/h)",
    min: 0.25,
    max: 4,
    step: 0.05,
    defaultValue: 1,
    hidden: (props) => props.heightMode !== "aspect",
  },
  borderRadius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 32,
    defaultValue: 6,
  },
  background: {
    type: ControlType.Color,
    title: "Background",
    defaultValue: "#f4f4f4",
  },
  border: {
    type: ControlType.Boolean,
    title: "Border",
    defaultValue: false,
  },
  borderColor: {
    type: ControlType.Color,
    title: "Border color",
    defaultValue: "#e0e0e0",
    hidden: (props) => !props.border,
  },
})
