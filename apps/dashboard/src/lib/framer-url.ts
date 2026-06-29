/**
 * A Framer project editor URL: https://framer.com/projects/<Name>--<ID>
 *
 * A malformed value (e.g. a missing scheme) lets framer-api half-connect by
 * salvaging the trailing id, then the session drops mid-sync with a cryptic
 * "Navigation failed: connection" ~90s later. Validate up front instead.
 */
const FRAMER_PROJECT_URL = /^https:\/\/framer\.com\/projects\/.+--.+$/

export function isFramerProjectUrl(value: string): boolean {
  return FRAMER_PROJECT_URL.test(value.trim())
}

/** Trim and normalise; returns "" for empty input. */
export function normalizeFramerProjectUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}
