// DecantConfig.tsx — drop ONE instance of this on each Framer page.
// It sets the global baseUrl, currency, and locale used by every other
// Decant component on that page. No more per-component URL wiring.
//
// In the Framer canvas it renders a visible config badge so it's easy to
// find and select. In preview and published sites it renders nothing.

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect } from "react"
import { setGlobalConfig } from "./decant.ts"

interface Props {
  baseUrl?: string
  currency?: string
  locale?: string
}

export function DecantConfig({ baseUrl, currency, locale }: Props) {
  useEffect(() => {
    setGlobalConfig({
      baseUrl: baseUrl ?? "",
      currency: currency ?? "USD",
      locale: locale ?? "en-US",
    })
  }, [baseUrl, currency, locale])

  // Canvas: render a visible placeholder so the component isn't invisible
  if (RenderTarget.current() === RenderTarget.canvas) {
    const connected = !!baseUrl
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderRadius: 8,
          border: `1.5px dashed ${connected ? "#7b1e3b" : "#ccc"}`,
          background: connected ? "#fdf6f8" : "#f7f7f7",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
          color: connected ? "#7b1e3b" : "#999",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 14 }}>⚙</span>
        <span>
          <strong>Decant</strong>
          {connected
            ? ` · ${baseUrl} · ${currency ?? "USD"}`
            : " · Set Base URL in properties →"}
        </span>
      </div>
    )
  }

  // Preview + published: invisible, side-effects only
  return null
}

DecantConfig.defaultProps = {
  baseUrl: "",
  currency: "USD",
  locale: "en-US",
}

addPropertyControls(DecantConfig, {
  baseUrl: {
    type: ControlType.String,
    title: "Base URL",
    placeholder: "https://template-withwine.vercel.app",
  },
  currency: {
    type: ControlType.String,
    title: "Currency",
    defaultValue: "USD",
  },
  locale: {
    type: ControlType.String,
    title: "Locale",
    defaultValue: "en-US",
  },
})
