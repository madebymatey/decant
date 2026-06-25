export type OriginAllowlistOptions = {
  /** Exact origins to allow. Defaults to the `ALLOWED_ORIGINS` env (CSV). */
  allowedOrigins?: string[]
  /**
   * Allow Framer editor/preview origins (*.framercanvas.com, *.framer.app,
   * framer.com). Defaults to `ALLOW_FRAMER_EDITOR_ORIGINS === "true"`.
   */
  allowFramerEditor?: boolean
}

function resolveAllowed(allowedOrigins?: string[]): string[] {
  if (allowedOrigins) {
    return allowedOrigins
  }
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveAllowFramerEditor(allowFramerEditor?: boolean): boolean {
  if (typeof allowFramerEditor === "boolean") {
    return allowFramerEditor
  }
  return process.env.ALLOW_FRAMER_EDITOR_ORIGINS === "true"
}

/** Whether an Origin header is permitted to call the middleware. */
export function isAllowedOrigin(
  origin: string | undefined,
  opts: OriginAllowlistOptions = {}
): boolean {
  if (!origin) {
    return false
  }

  const allowed = resolveAllowed(opts.allowedOrigins)
  if (allowed.includes(origin)) {
    return true
  }

  if (resolveAllowFramerEditor(opts.allowFramerEditor)) {
    const o = origin.toLowerCase()
    if (o.endsWith(".framercanvas.com")) return true
    if (o.endsWith(".framer.app")) return true
    if (o.endsWith(".framer.website")) return true
    if (o === "https://framer.com") return true
    if (o === "https://www.framer.com") return true
  }

  return false
}
