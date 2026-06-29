// FilterCheckbox.tsx — a single multi-select filter checkbox, driven by CMS data.
//
// Native, CMS-sourced setup:
// 1. Sync /api/feed/wine-types into a "Wine Types" CMS collection.
// 2. Add a native Collection List bound to that collection.
// 3. Inside the list item, place FilterCheckbox and bind its "Value" prop to the
//    item's slug field (and optionally design a label bound to the name field).
//
// Clicking toggles the option in the shared filter store that ProductList reads.
// Connect a Checkbox component with variants to drive checked/unchecked visuals.

import { addPropertyControls, ControlType } from "framer"
import { cloneElement, isValidElement } from "react"
import { useFacet, slugify } from "./decant.ts"

interface Props {
  facet?: string
  value?: string
  label?: string
  normalizeToSlug?: boolean
  checkbox?: unknown
  checkedVariant?: string
  uncheckedVariant?: string
  showLabel?: boolean
  labelColor?: string
  font?: React.CSSProperties
  gap?: number
  accent?: string
  size?: number
  style?: React.CSSProperties
}

export function FilterCheckbox({
  facet = "wineType",
  value,
  label,
  normalizeToSlug = true,
  checkbox,
  checkedVariant,
  uncheckedVariant,
  showLabel = true,
  labelColor = "#1a1a1a",
  font,
  gap = 8,
  accent = "#7b1e3b",
  size = 18,
  style,
}: Props) {
  const { isActive, toggle } = useFacet(facet)
  const raw = (value ?? "").trim()
  const key = normalizeToSlug ? slugify(raw) : raw
  const checked = key ? isActive(key) : false

  const renderBox = () => {
    const el = Array.isArray(checkbox)
      ? (checkbox.find((n) => isValidElement(n)) as React.ReactElement | undefined)
      : isValidElement(checkbox)
      ? (checkbox as React.ReactElement)
      : undefined
    if (el) {
      const variant = checked ? checkedVariant : uncheckedVariant
      return cloneElement(el, variant ? { variant } : {})
    }
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          border: `1.5px solid ${accent}`,
          background: checked ? accent : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: Math.round(size * 0.7),
          flexShrink: 0,
        }}
      >
        {checked ? "✓" : ""}
      </span>
    )
  }

  return (
    <div
      onClick={() => key && toggle(key)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        cursor: "pointer",
        userSelect: "none",
        ...style,
      }}
    >
      {renderBox()}
      {showLabel && (
        <span style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, color: labelColor, ...font }}>
          {label || raw}
        </span>
      )}
    </div>
  )
}

FilterCheckbox.defaultProps = {
  facet: "wineType",
  normalizeToSlug: true,
  showLabel: true,
  labelColor: "#1a1a1a",
  gap: 8,
  accent: "#7b1e3b",
  size: 18,
  checkedVariant: "Checked",
  uncheckedVariant: "Unchecked",
}

addPropertyControls(FilterCheckbox, {
  facet: {
    type: ControlType.String,
    title: "Facet",
    defaultValue: "wineType",
    description: "Filter key — must match the product field (wineType, varietal, …).",
  },
  value: {
    type: ControlType.String,
    title: "Value",
    description: "Bind to the CMS slug (or name) field of this option.",
  },
  label: {
    type: ControlType.String,
    title: "Label",
    placeholder: "Falls back to Value",
    hidden: (props) => !props.showLabel,
  },
  normalizeToSlug: {
    type: ControlType.Boolean,
    title: "Slugify value",
    defaultValue: true,
    description: "On = matches ProductList by slug (bind name or slug, either works).",
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
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 0,
    max: 32,
    defaultValue: 8,
  },
  accent: {
    type: ControlType.Color,
    title: "Accent",
    defaultValue: "#7b1e3b",
    hidden: (props) => !!props.checkbox,
  },
  size: {
    type: ControlType.Number,
    title: "Box size",
    min: 12,
    max: 36,
    defaultValue: 18,
    hidden: (props) => !!props.checkbox,
  },
})
