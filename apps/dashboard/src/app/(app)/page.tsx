import Link from "next/link"
import { ArrowUpRight, Plus, Wine } from "lucide-react"
import { listProjects } from "@/lib/projects"
import { relativeTime, intervalLabel } from "@/lib/format"
import { Badge, EmptyState, LinkButton } from "@/components/ui"
import { integrationLabel } from "@/lib/integrations"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const projects = await listProjects()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
          <p className="mt-0.5 text-sm text-muted">
            {projects.length === 0
              ? "No projects yet."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <LinkButton href="/projects/new" variant="primary" size="md">
          <Plus size={16} />
          New project
        </LinkButton>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="Create your first project"
          description="A project connects a client's catalog (e.g. WithWine) to their Framer site and keeps it in sync."
          action={
            <LinkButton href="/projects/new" variant="primary">
              <Plus size={16} />
              New project
            </LinkButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.slug}`}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-background">
                    <Wine size={16} className="text-muted" />
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">{p.name}</p>
                    <p className="font-mono text-xs text-subtle">/{p.slug}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{integrationLabel(p.integration)}</Badge>
                {p.scheduleEnabled ? (
                  <Badge tone="success">{intervalLabel(p.scheduleIntervalMinutes)}</Badge>
                ) : (
                  <Badge tone="neutral">Manual</Badge>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                <span>{p.clientName ?? "—"}</span>
                <span>Synced {relativeTime(p.lastSyncAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
