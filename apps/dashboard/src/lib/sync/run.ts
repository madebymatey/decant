import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { projects, syncRuns, collectionMappings, type SyncCounts } from "@/db/schema"
import { getSecret } from "@/lib/projects"

export type SyncOutcome = {
  ok: boolean
  runId: string
  counts?: SyncCounts
  error?: string
}

/**
 * Execute a sync for one project by triggering its own deployment.
 *
 * The dashboard is the control plane: it doesn't run the Framer push itself, it
 * calls the project's data-plane deploy (`POST <deployUrl>/api/sync/run`, gated by
 * the project's syncKey) and passes the collection mappings in the body. The
 * deploy does the work with its own credentials; we record the result here so the
 * Activity feed + "last synced" keep working. Never throws.
 */
export async function executeSync(
  projectId: string,
  trigger: "manual" | "scheduled",
  triggeredBy?: string
): Promise<SyncOutcome> {
  const startedAt = new Date()
  const [run] = await db
    .insert(syncRuns)
    .values({ projectId, trigger, status: "running", startedAt, triggeredBy })
    .returning({ id: syncRuns.id })

  try {
    const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) })
    if (!project) throw new Error("Project not found")
    if (!project.deployUrl) {
      throw new Error("No deployment URL set for this project — add it in Settings first.")
    }

    const [syncKey, mappings] = await Promise.all([
      getSecret(projectId, "syncKey"),
      db.select().from(collectionMappings).where(eq(collectionMappings.projectId, projectId)),
    ])

    const counts = await triggerRemoteSync(project.deployUrl, syncKey, mappings)

    const finishedAt = new Date()
    await db
      .update(syncRuns)
      .set({
        status: "success",
        counts,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      })
      .where(eq(syncRuns.id, run.id))

    await db
      .update(projects)
      .set({ lastSyncAt: finishedAt, nextSyncAt: computeNextSync(project.scheduleIntervalMinutes) })
      .where(eq(projects.id, projectId))

    return { ok: true, runId: run.id, counts }
  } catch (e) {
    const finishedAt = new Date()
    const error = e instanceof Error ? e.message : String(e)
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        error,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      })
      .where(eq(syncRuns.id, run.id))
    return { ok: false, runId: run.id, error }
  }
}

/** POST the project's deploy and normalise its response into SyncCounts. */
async function triggerRemoteSync(
  deployUrl: string,
  syncKey: string | undefined,
  mappings: Array<{ source: string; framerCollectionName: string; fieldOverrides: unknown }>
): Promise<SyncCounts> {
  const url = `${deployUrl.replace(/\/+$/, "")}/api/sync/run`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(syncKey ? { authorization: `Bearer ${syncKey}` } : {}),
    },
    body: JSON.stringify({ mappings }),
    // decant itself runs on Hobby (60s function cap), so wait just under that —
    // the deploy's own sync is likewise capped at 60s.
    signal: AbortSignal.timeout(55_000),
  })

  const text = await res.text()
  let json: { ok?: boolean; result?: Partial<SyncCounts>; error?: string } = {}
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Deploy returned ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.ok || json.ok === false) {
    throw new Error(json.error ?? `Deploy sync failed (${res.status})`)
  }

  const r = json.result ?? {}
  return {
    added: r.added ?? 0,
    updated: r.updated ?? 0,
    deleted: r.deleted ?? 0,
    failed: r.failed ?? 0,
    skipped: r.skipped ?? 0,
  }
}

/** Next run time for a project that just synced, given its interval. */
export function computeNextSync(intervalMinutes: number): Date {
  return new Date(Date.now() + intervalMinutes * 60_000)
}
