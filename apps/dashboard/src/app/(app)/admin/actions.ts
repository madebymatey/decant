"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { allowedDomains, sessions, users } from "@/db/schema"
import { requireAdmin } from "@/lib/guards"
import { bootstrapAdminEmail } from "@/lib/access"

function str(form: FormData, key: string): string {
  return (form.get(key) ?? "").toString().trim()
}

export async function addDomainAction(form: FormData): Promise<void> {
  const session = await requireAdmin()
  const domain = str(form, "domain").toLowerCase().replace(/^@/, "")
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return
  await db
    .insert(allowedDomains)
    .values({ domain, createdBy: session.user.email ?? session.user.id })
    .onConflictDoNothing({ target: allowedDomains.domain })
  revalidatePath("/admin")
}

export async function removeDomainAction(form: FormData): Promise<void> {
  await requireAdmin()
  const id = str(form, "domainId")
  await db.delete(allowedDomains).where(eq(allowedDomains.id, id))
  revalidatePath("/admin")
}

export async function setRoleAction(form: FormData): Promise<void> {
  await requireAdmin()
  const userId = str(form, "userId")
  const role = str(form, "role") === "admin" ? "admin" : "member"
  await db.update(users).set({ role }).where(eq(users.id, userId))
  revalidatePath("/admin")
}

export async function revokeUserAction(form: FormData): Promise<void> {
  const session = await requireAdmin()
  const userId = str(form, "userId")
  // Never revoke the authoritative admin or yourself.
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!target) return
  if (target.email.toLowerCase() === bootstrapAdminEmail()) return
  if (target.id === session.user.id) return

  await db.update(users).set({ status: "revoked" }).where(eq(users.id, userId))
  // Kill any live sessions so the revoke takes effect immediately.
  await db.delete(sessions).where(eq(sessions.userId, userId))
  revalidatePath("/admin")
}

export async function reinstateUserAction(form: FormData): Promise<void> {
  await requireAdmin()
  const userId = str(form, "userId")
  await db.update(users).set({ status: "active" }).where(eq(users.id, userId))
  revalidatePath("/admin")
}
