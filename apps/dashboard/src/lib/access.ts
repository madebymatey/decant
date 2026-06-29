import { eq } from "drizzle-orm"
import { db } from "@/db"
import { allowedDomains, users } from "@/db/schema"

/** The authoritative admin email (always allowed, force-promoted to admin). */
export function bootstrapAdminEmail(): string | undefined {
  return process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || undefined
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? ""
}

/**
 * Decide whether `email` may sign in. Order:
 *   1. The bootstrap admin is always allowed (so you can get in first).
 *   2. A user explicitly marked 'revoked' is always denied.
 *   3. Otherwise the email's domain must be on the allowlist.
 */
export async function canSignIn(email: string): Promise<boolean> {
  const lower = email.toLowerCase()
  if (lower === bootstrapAdminEmail()) return true

  const existing = await db.query.users.findFirst({
    where: eq(users.email, lower),
    columns: { status: true },
  })
  if (existing?.status === "revoked") return false

  const domain = emailDomain(lower)
  if (!domain) return false
  const allowed = await db.query.allowedDomains.findFirst({
    where: eq(allowedDomains.domain, domain),
    columns: { id: true },
  })
  return Boolean(allowed)
}
