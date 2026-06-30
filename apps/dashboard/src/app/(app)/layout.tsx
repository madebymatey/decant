import { signOut } from "@/auth"
import { requireUser } from "@/lib/guards"
import { TopNav } from "@/components/TopNav"
import { ToastProvider } from "@/components/Toast"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()

  async function signOutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <TopNav
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
          isAdmin={session.user.role === "admin"}
          signOutAction={signOutAction}
        />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </ToastProvider>
  )
}
