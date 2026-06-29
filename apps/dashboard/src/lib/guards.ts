import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { Session } from "next-auth"

/**
 * Require an authenticated, non-revoked user. Redirects to /login otherwise.
 * Returns the session for convenience in server components.
 */
export async function requireUser(): Promise<Session> {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.status === "revoked") redirect("/login?revoked=1")
  return session
}

/** Require an admin. Redirects non-admins to the dashboard home. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser()
  if (session.user.role !== "admin") redirect("/")
  return session
}
