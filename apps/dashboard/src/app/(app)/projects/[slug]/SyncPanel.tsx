import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import type { Project, SyncRun } from "@/db/schema"
import { relativeTime } from "@/lib/format"
import { Badge, Card } from "@/components/ui"
import { SyncNowCard } from "./SyncNowCard"
import { SyncActivityChart } from "./SyncActivityChart"

function countsSummary(run: SyncRun): string {
  const c = run.counts
  if (!c) return run.status === "running" ? "in progress" : "—"
  return `${c.added}A · ${c.updated}U · ${c.deleted}D`
}

export function SyncPanel({
  project,
  runs,
  activity,
}: {
  project: Project
  runs: SyncRun[]
  activity: SyncRun[]
}) {
  const lastSuccess = runs.find((r) => r.status === "success")

  return (
    <div className="space-y-4">
      <SyncActivityChart activity={activity} />
      <SyncNowCard project={project} />

      {lastSuccess?.counts ? (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Added" value={lastSuccess.counts.added} />
          <Stat label="Updated" value={lastSuccess.counts.updated} />
          <Stat label="Deleted" value={lastSuccess.counts.deleted} />
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">Activity</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-subtle">No syncs yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <StatusIcon status={run.status} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {run.status === "failed" && run.error ? run.error : countsSummary(run)}
                    </p>
                    <p className="text-xs text-subtle">{relativeTime(run.startedAt)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={run.trigger === "manual" ? "neutral" : "accent"}>
                    {run.trigger}
                  </Badge>
                  {run.durationMs != null ? (
                    <span className="text-xs text-subtle">{Math.round(run.durationMs / 1000)}s</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 size={16} className="shrink-0 text-success" />
  if (status === "failed") return <AlertCircle size={16} className="shrink-0 text-danger" />
  return <Loader2 size={16} className="shrink-0 animate-[spin_0.7s_linear_infinite] text-muted" />
}
