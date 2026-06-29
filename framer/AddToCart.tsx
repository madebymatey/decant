import { addPropertyControls, ControlType } from "framer"
import { useCallback, useState } from "react"
import { addToCart, useProductCard } from "./decant.ts"

interface Props {
  children?: React.ReactNode
  productId: string
  productTitle?: string
  price?: number | null
  imageFile?: unknown
  image?: string
  quantity?: number
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

export function AddToCart({
  children,
  productId,
  productTitle,
  price,
  imageFile,
  image,
  quantity,
  addedLabel,
  accent,
  radius,
  style,
}: Props) {
  const [added, setAdded] = useState(false)
  // When used inside a ProductList card, fall back to the card's product so the
  // button works without manually wiring every field.
  const product = useProductCard()

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

  // When a designed component is slotted in, wrap it invisibly — the design
  // owns all visuals, we only inject the click behaviour.
  if (children) {
    return (
      <div style={{ display: "contents", cursor: "pointer" }} onClick={handleClick}>
        {children}
      </div>
    )
  }

  // Default UI — useful for rapid testing before the design is connected.
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "10px 20px",
        borderRadius: radius,
        border: "none",
        background: added ? "#22c55e" : accent,
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.25s",
        ...style,
      }}
    >
      {added ? addedLabel : "Add to cart"}
    </button>
  )
}

AddToCart.defaultProps = {
  productId: "",
  productTitle: "",
  price: null,
  image: "",
  quantity: 1,
  addedLabel: "Added!",
  accent: "#7b1e3b",
  radius: 8,
}

addPropertyControls(AddToCart, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Design",
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
