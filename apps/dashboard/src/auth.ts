import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"
import { bootstrapAdminEmail, canSignIn } from "@/lib/access"

// Surface our custom user columns on the session type.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "admin" | "member"
      status: "active" | "revoked"
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  // Trust the incoming Host (Vercel sets this automatically; locally we rely on
  // AUTH_URL). Without it, Auth.js can default to https on localhost and the
  // post-login redirect fails with ERR_SSL_PROTOCOL_ERROR.
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Gate every sign-in attempt against the allowlist + revoke status.
      return user.email ? canSignIn(user.email) : false
    },
    async session({ session, user }) {
      // `user` is the DB row (database sessions) — carry role/status through.
      const row = user as typeof user & { role?: string; status?: string }
      session.user.id = user.id
      session.user.role = row.role === "admin" ? "admin" : "member"
      session.user.status = row.status === "revoked" ? "revoked" : "active"
      return session
    },
  },
  events: {
    // Force-promote the authoritative admin on login (idempotent).
    async signIn({ user }) {
      const email = user.email?.toLowerCase()
      if (email && email === bootstrapAdminEmail()) {
        await db.update(users).set({ role: "admin" }).where(eq(users.email, email))
      }
    },
  },
})
