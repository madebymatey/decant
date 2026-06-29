/** Reserved top-level paths that a project slug must never collide with. */
export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "logout",
  "admin",
  "projects",
  "settings",
  "_next",
  "favicon.ico",
])

/** Turn an arbitrary name into a URL-safe slug. */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(slug) && !RESERVED_SLUGS.has(slug)
}
