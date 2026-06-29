// WineTypeFilter.tsx — multi-select checkbox filter. Options come live from a
// feed endpoint (e.g. /api/feed/wine-types) so the list is always current.
// Selecting options updates a shared filter store that ProductList reads.
//
// Checkbox design: connect a Framer component with variants (e.g. "Unchecked" /
// "Checked") to the Checkbox slot, and set the variant names below. The filter
// switches the variant per option based on selection. Leave the slot empty to
// use the built-in checkbox.

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useState, cloneElement, isValidElement } from "react"
import { useFacet, useGlobalConfig, slugify } from "./decant.ts"

type Option = { id: string; slug: string; name: string }

interface Props {
  baseUrl?: string
  facet?: string
  endpoint?: string
  manualOptions?: string
  checkbox?: unknown
  checkedVariant?: string
  uncheckedVariant?: string
  direction?: "vertical" | "horizontal"
  gap?: number
  showLabel?: boolean
  labelColor?: string
  font?: React.CSSProperties
  accent?: string
  style?: React.CSSProperties
}

const CANVAS_OPTIONS: Option[] = [
  { id: "red", slug: "red", name: "Red" },
  { id: "white", slug: "white", name: "White" },
  { id: "rose", slug: "rose", name: "Rosé" },
]

export function WineTypeFilter({
  baseUrl,
  facet = "wineType",
  endpoint,
  manualOptions,
  checkbox,
  checkedVariant,
  uncheckedVariant,
  direction = "vertical",
  gap = 10,
  showLabel = true,
  labelColor = "#1a1a1a",
  font,
  accent = "#7b1e3b",
  style,
}: Props) {
  const config = useGlobalConfig()
  const url = baseUrl || config.baseUrl
  const onCanvas = RenderTarget.current() === RenderTarget.canvas
  const { isActive, toggle } = useFacet(facet)

  const [options, setOptions] = useState<Option[]>(onCanvas ? CANVAS_OPTIONS : [])

  useEffect(() => {
    // Manual override wins — comma-separated list of labels.
    if (manualOptions && manualOptions.trim()) {
      setOptions(
        manualOptions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ id: slugify(name), slug: slugify(name), name }))
      )
      return
    }
    if (onCanvas || !url) return
    const path = endpoint || "/api/feed/wine-types"
    let cancelled = false
    fetch(`${url.replace(/\/$/, "")}${path}`)
      .then((r) => r.json())
      .then((data: Option[]) => {
        if (!cancelled && Array.isArray(data)) setOptions(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url, endpoint, manualOptions, onCanvas])

  const hasCheckboxDesign = isValidElement(checkbox) || Array.isArray(checkbox)

  const renderCheckbox = (checked: boolean) => {
    if (hasCheckboxDesign) {
      const el = Array.isArray(checkbox)
        ? (checkbox.find((n) => isValidElement(n)) as React.ReactElement)
        : (checkbox as React.ReactElement)
      if (el) {
        const variant = checked ? checkedVariant : uncheckedVariant
        return cloneElement(el, variant ? { variant } : {})
      }
    }
    // Built-in checkbox
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `1.5px solid ${accent}`,
          background: checked ? accent : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {checked ? "✓" : ""}
      </span>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        flexWrap: direction === "horizontal" ? "wrap" : "nowrap",
        gap,
        ...style,
      }}
    >
      {options.map((opt) => {
        const checked = isActive(opt.slug)
        return (
          <div
            key={opt.id}
            onClick={() => toggle(opt.slug)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {renderCheckbox(checked)}
            {showLabel && (
              <span
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 14,
                  color: labelColor,
                  ...font,
                }}
              >
                {opt.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

WineTypeFilter.defaultProps = {
  facet: "wineType",
  direction: "vertical",
  gap: 10,
  showLabel: true,
  labelColor: "#1a1a1a",
  accent: "#7b1e3b",
  checkedVariant: "Checked",
  uncheckedVariant: "Unchecked",
}

addPropertyControls(WineTypeFilter, {
  baseUrl: {
    type: ControlType.String,
    title: "Base URL",
    placeholder: "Uses DecantConfig if blank",
  },
  facet: {
    type: ControlType.String,
    title: "Facet",
    defaultValue: "wineType",
    description: "Filter key — must match the product field (wineType, varietal, …).",
  },
  endpoint: {
    type: ControlType.String,
    title: "Options endpoint",
    placeholder: "/api/feed/wine-types",
  },
  manualOptions: {
    type: ControlType.String,
    title: "Manual options",
    placeholder: "Red, White, Rosé (overrides endpoint)",
  },
  checkbox: {
    type: ControlType.ComponentInstance,
    title: "Checkbox",
  },
  checkedVariant: {
    type: ControlType.String,
    title: "Checked variant",
    defaultValue: "Checked",
    hidden: (props) => !props.checkbox,
  },
  uncheckedVariant: {
    type: ControlType.String,
    title: "Unchecked variant",
    defaultValue: "Unchecked",
    hidden: (props) => !props.checkbox,
  },
  direction: {
    type: ControlType.Enum,
    title: "Direction",
    options: ["vertical", "horizontal"],
    optionTitles: ["Vertical", "Horizontal"],
    defaultValue: "vertical",
    displaySegmentedControl: true,
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 0,
    max: 48,
    defaultValue: 10,
  },
  showLabel: {
    type: ControlType.Boolean,
    title: "Show label",
    defaultValue: true,
  },
  labelColor: {
    type: ControlType.Color,
    title: "Label color",
    defaultValue: "#1a1a1a",
    hidden: (props) => !props.showLabel,
  },
  font: {
    type: ControlType.Font,
    title: "Font",
    controls: "extended",
    defaultFontType: "sans-serif",
    hidden: (props) => !props.showLabel,
  },
  accent: {
    type: ControlType.Color,
    title: "Accent",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.checkbox,
  },
})
