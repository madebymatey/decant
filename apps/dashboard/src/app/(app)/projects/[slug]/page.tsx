import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { ChevronLeft, Wine } from "lucide-react"
import { requireUser } from "@/lib/guards"
import {
  getProjectBySlug,
  listSyncRuns,
  getMappings,
  listSecretNames,
} from "@/lib/projects"
import { relativeTime, intervalLabel } from "@/lib/format"
import { Badge } from "@/components/ui"
import { cn } from "@/lib/cn"
import { SyncPanel } from "./SyncPanel"
import { SchedulePanel } from "./SchedulePanel"
import { FeedsPanel } from "./FeedsPanel"
import { CollectionsPanel } from "./CollectionsPanel"
import { SettingsPanel } from "./SettingsPanel"

export const dynamic = "force-dynamic"

const TABS = ["sync", "schedule", "feeds", "collections", "settings"] as const
type Tab = (typeof TABS)[number]

const integrationLabels: Record<string, string> = { withwine: "WithWine" }

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { tab?: string }
}) {
  await requireUser()
  const project = await getProjectBySlug(params.slug)
  if (!project) notFound()

  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "sync"

  const [runs, mappings, secretsSet] = await Promise.all([
    listSyncRuns(project.id, 12),
    getMappings(project.id),
    listSecretNames(project.id),
  ])

  // Best-effort absolute origin for displaying public feed URLs.
  const h = headers()
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("host") ?? "decant.matey.co"
  const baseUrl = `${proto}://${host}`

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} />
        Projects
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-surface">
            <Wine size={18} className="text-muted" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
            <p className="font-mono text-xs text-subtle">/{project.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge tone="accent">{integrationLabels[project.integration] ?? project.integration}</Badge>
          {project.scheduleEnabled ? (
            <Badge tone="success">{intervalLabel(project.scheduleIntervalMinutes)}</Badge>
          ) : (
            <Badge tone="neutral">Manual</Badge>
          )}
          <span className="text-xs text-muted">Synced {relativeTime(project.lastSyncAt)}</span>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/projects/${project.slug}?tab=${t}`}
            className={cn(
              "border-b-2 px-3 pb-2.5 pt-1 text-sm capitalize transition-colors",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "sync" && <SyncPanel project={project} runs={runs} />}
      {tab === "schedule" && <SchedulePanel project={project} />}
      {tab === "feeds" && (
        <FeedsPanel
          project={project}
          baseUrl={baseUrl}
          hasFeedKey={secretsSet.includes("feedKey")}
        />
      )}
      {tab === "collections" && <CollectionsPanel project={project} mappings={mappings} />}
      {tab === "settings" && <SettingsPanel project={project} secretsSet={secretsSet} />}
    </div>
  )
}
