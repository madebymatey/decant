import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { cloneElement, isValidElement, useCallback, useState } from "react"
import { addToCart, useProductCard } from "./decant.ts"

type Size = "fill" | "default"

interface Props {
  children?: React.ReactNode
  buttonDisabled?: React.ReactNode
  productId: string
  productTitle?: string
  price?: number | null
  imageFile?: unknown
  image?: string
  quantity?: number
  buttonSize?: { width?: Size; height?: Size }
  disableOutOfStock?: boolean
  preview?: "default" | "outOfStock"
  addedLabel?: string
  accent?: string
  radius?: number
  style?: React.CSSProperties
}

// CMS Image fields come through as a URL string or a { src } object depending on
// the control type — normalise to a plain URL string.
function resolveImageUrl(imageFile: unknown, image?: string): string {
  if (typeof imageFile === "string" && imageFile) return imageFile
  if (imageFile && typeof imageFile === "object" && "src" in imageFile) {
    const src = (imageFile as { src?: string }).src
    if (src) return src
  }
  return image ?? ""
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export function AddToCart({
  children,
  buttonDisabled,
  productId,
  productTitle,
  price,
  imageFile,
  image,
  quantity,
  buttonSize,
  disableOutOfStock,
  preview,
  addedLabel,
  accent,
  radius,
  style,
}: Props) {
  const [added, setAdded] = useState(false)
  // When used inside a ProductList card, fall back to the card's product so the
  // button works without manually wiring every field.
  const product = useProductCard()

  // Out of stock: on the canvas we honour the Preview control so both states
  // are designable; live, we use the product's availability when the toggle is on.
  const isCanvas = RenderTarget.current() === RenderTarget.canvas
  const outOfStock = isCanvas
    ? preview === "outOfStock"
    : Boolean(disableOutOfStock) && product?.available === false

  // Button Size preferences (default to Fill on both axes).
  const fillW = (buttonSize?.width ?? "fill") === "fill"
  const fillH = (buttonSize?.height ?? "fill") === "fill"

  const handleClick = useCallback(() => {
    const id = productId || product?.id
    if (!id) return
    const resolvedImage =
      resolveImageUrl(imageFile, image) || product?.image || product?.images?.[0] || ""
    addToCart(
      {
        id,
        title: productTitle || product?.title,
        price: price ?? product?.price ?? null,
        image: resolvedImage,
      },
      quantity
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }, [productId, productTitle, price, imageFile, image, quantity, product])

  // When a designed component is slotted in, the design owns all visuals — we
  // only inject the click behaviour + the chosen sizing. Framer sizes each
  // slotted instance on its own, so "Fill" is applied by injecting width/height
  // 100% onto the child; "Default" leaves the design's own size untouched.
  if (children) {
    // Show the disabled design when out of stock (falling back to the normal
    // design if no disabled one is provided).
    const design =
      outOfStock && isValidElement(buttonDisabled) ? buttonDisabled : children
    const sizeStyle: React.CSSProperties = {}
    if (fillW) sizeStyle.width = "100%"
    if (fillH) sizeStyle.height = "100%"
    const sized = isValidElement(design)
      ? cloneElement(
          design as React.ReactElement<{ style?: React.CSSProperties }>,
          {
            style: {
              ...(design as React.ReactElement<{ style?: React.CSSProperties }>)
                .props.style,
              ...sizeStyle,
            },
          }
        )
      : design
    return (
      <div
        onClick={outOfStock ? undefined : handleClick}
        style={{
          display: "flex",
          width: fillW ? "100%" : "fit-content",
          height: fillH ? "100%" : "fit-content",
          cursor: outOfStock ? "not-allowed" : "pointer",
          ...style,
        }}
      >
        {sized}
      </div>
    )
  }

  // Default UI — useful for rapid testing before the design is connected.
  return (
    <button
      type="button"
      onClick={outOfStock ? undefined : handleClick}
      disabled={outOfStock}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: fillW ? "100%" : "fit-content",
        height: fillH ? "100%" : "fit-content",
        padding: "10px 20px",
        borderRadius: radius,
        border: "none",
        background: outOfStock ? "#9ca3af" : added ? "#22c55e" : accent,
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        cursor: outOfStock ? "not-allowed" : "pointer",
        transition: "background 0.25s",
        ...style,
      }}
    >
      {outOfStock ? "Out of stock" : added ? addedLabel : "Add to cart"}
    </button>
  )
}

AddToCart.defaultProps = {
  productId: "",
  productTitle: "",
  price: null,
  image: "",
  quantity: 1,
  buttonSize: { width: "fill", height: "fill" },
  disableOutOfStock: false,
  preview: "default",
  addedLabel: "Added!",
  accent: "#7b1e3b",
  radius: 8,
}

addPropertyControls(AddToCart, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
  },
  buttonDisabled: {
    type: ControlType.ComponentInstance,
    title: "Disabled",
    description: "Shown when out of stock (optional).",
    hidden: (props) => !props.children,
  },
  productId: {
    type: ControlType.String,
    title: "Product ID",
    placeholder: "e.g. 7321",
  },
  productTitle: {
    type: ControlType.String,
    title: "Title",
    placeholder: "For cart display",
  },
  price: {
    type: ControlType.Number,
    title: "Price",
    min: 0,
    step: 0.01,
  },
  imageFile: {
    type: ControlType.ResponsiveImage,
    title: "Image",
    description: "Connect to a CMS image field.",
  },
  image: {
    type: ControlType.String,
    title: "Image URL",
    placeholder: "Or paste a URL",
  },
  quantity: {
    type: ControlType.Number,
    title: "Qty",
    min: 1,
    step: 1,
    defaultValue: 1,
  },
  // Grouped Width/Height sizing — one "Button Size" row with a popover.
  buttonSize: {
    type: ControlType.Object,
    title: "Button Size",
    defaultValue: { width: "fill", height: "fill" },
    controls: {
      width: {
        type: ControlType.Enum,
        title: "Width",
        options: ["default", "fill"],
        optionTitles: ["Default", "Fill"],
        defaultValue: "fill",
        displaySegmentedControl: true,
      },
      height: {
        type: ControlType.Enum,
        title: "Height",
        options: ["default", "fill"],
        optionTitles: ["Default", "Fill"],
        defaultValue: "fill",
        displaySegmentedControl: true,
      },
    },
  },
  disableOutOfStock: {
    type: ControlType.Boolean,
    title: "Disable OOS",
    enabledTitle: "Yes",
    disabledTitle: "No",
    defaultValue: false,
    description: "Disable + block the button when the product is out of stock.",
  },
  preview: {
    type: ControlType.Enum,
    title: "Preview",
    options: ["default", "outOfStock"],
    optionTitles: ["Default", "Out of Stock"],
    defaultValue: "default",
    displaySegmentedControl: true,
    description: "Canvas preview only — has no effect on the live site.",
    hidden: (props) => !props.disableOutOfStock,
  },
  // Visual controls only shown when using the built-in default UI
  addedLabel: {
    type: ControlType.String,
    title: "Added label",
    defaultValue: "Added!",
    hidden: (props) => !!props.children,
  },
  accent: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.children,
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    min: 0,
    max: 32,
    defaultValue: 8,
    hidden: (props) => !!props.children,
  },
})
