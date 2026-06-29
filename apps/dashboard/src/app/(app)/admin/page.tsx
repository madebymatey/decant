import { desc } from "drizzle-orm"
import { Plus, X } from "lucide-react"
import { db } from "@/db"
import { allowedDomains, users } from "@/db/schema"
import { requireAdmin } from "@/lib/guards"
import { bootstrapAdminEmail } from "@/lib/access"
import { relativeTime } from "@/lib/format"
import { Badge, Button, Card, CardHeader, Input } from "@/components/ui"
import {
  addDomainAction,
  removeDomainAction,
  setRoleAction,
  revokeUserAction,
  reinstateUserAction,
} from "./actions"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await requireAdmin()
  const admin = bootstrapAdminEmail()

  const [domains, allUsers] = await Promise.all([
    db.select().from(allowedDomains).orderBy(desc(allowedDomains.createdAt)),
    db.select().from(users).orderBy(desc(users.createdAt)),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Access</h1>
        <p className="mt-0.5 text-sm text-muted">
          Control who can sign in and what they can do. Authoritative admin:{" "}
          <span className="font-mono text-foreground">{admin ?? "unset"}</span>.
        </p>
      </div>

      {/* Allowed domains */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Allowed domains</h2>
          <p className="mt-0.5 text-xs text-muted">
            Anyone with a Google account on these domains may sign in.
          </p>
        </CardHeader>
        <form action={addDomainAction} className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Input name="domain" placeholder="matey.co" className="max-w-xs" />
          <Button type="submit" variant="secondary" size="sm">
            <Plus size={14} />
            Add
          </Button>
        </form>
        {domains.length === 0 ? (
          <p className="px-5 py-6 text-sm text-subtle">No domains yet — only the authoritative admin can sign in.</p>
        ) : (
          <ul className="divide-y divide-border">
            {domains.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-mono text-sm">@{d.domain}</p>
                  <p className="text-xs text-subtle">Added {relativeTime(d.createdAt)}</p>
                </div>
                <form action={removeDomainAction}>
                  <input type="hidden" name="domainId" value={d.id} />
                  <button
                    type="submit"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-muted hover:bg-surface-hover hover:text-danger"
                    aria-label="Remove domain"
                  >
                    <X size={14} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Users</h2>
          <p className="mt-0.5 text-xs text-muted">Promote admins or revoke access.</p>
        </CardHeader>
        {allUsers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-subtle">No one has signed in yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {allUsers.map((u) => {
              const isBootstrap = u.email.toLowerCase() === admin
              const isSelf = u.id === session.user.id
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-sm">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="text-sm">
                        {u.name ?? u.email}
                        {isSelf ? <span className="ml-1.5 text-xs text-subtle">(you)</span> : null}
                      </p>
                      <p className="text-xs text-subtle">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {u.status === "revoked" ? (
                      <Badge tone="danger">Revoked</Badge>
                    ) : (
                      <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role}</Badge>
                    )}

                    {!isBootstrap && !isSelf ? (
                      <>
                        {u.status === "revoked" ? (
                          <form action={reinstateUserAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <Button type="submit" variant="secondary" size="sm">
                              Reinstate
                            </Button>
                          </form>
                        ) : (
                          <>
                            <form action={setRoleAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input
                                type="hidden"
                                name="role"
                                value={u.role === "admin" ? "member" : "admin"}
                              />
                              <Button type="submit" variant="ghost" size="sm">
                                {u.role === "admin" ? "Demote" : "Make admin"}
                              </Button>
                            </form>
                            <form action={revokeUserAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <Button type="submit" variant="danger" size="sm">
                                Revoke
                              </Button>
                            </form>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-subtle">
                        {isBootstrap ? "Authoritative admin" : ""}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
