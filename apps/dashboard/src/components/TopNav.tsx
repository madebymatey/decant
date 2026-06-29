"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"
import { cn } from "@/lib/cn"

export function TopNav({
  user,
  isAdmin,
  signOutAction,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
  isAdmin: boolean
  signOutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const tabs = [
    { href: "/", label: "Projects", match: (p: string) => p === "/" || p.startsWith("/projects") },
    ...(isAdmin
      ? [{ href: "/admin", label: "Access", match: (p: string) => p.startsWith("/admin") }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong bg-surface text-sm font-semibold">
              D
            </span>
            <span className="text-sm font-semibold tracking-tight">Decant</span>
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1 pl-1 pr-2 text-sm hover:bg-surface-hover"
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-xs">
                {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <ChevronDown size={14} className="text-muted" />
          </button>

          {open ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="truncate text-sm font-medium">{user.name ?? "Account"}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                  {isAdmin ? (
                    <span className="mt-1.5 inline-block rounded-full border border-border-strong bg-surface-hover px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      Admin
                    </span>
                  ) : null}
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-muted hover:bg-surface-hover hover:text-foreground"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="mx-auto -mb-px flex max-w-6xl items-center gap-1 px-4 sm:px-6">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-2 pb-2.5 pt-1 text-sm transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </header>
  )
}
