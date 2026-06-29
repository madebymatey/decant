import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { projects, syncRuns, collectionMappings, type SyncCounts } from "@/db/schema"
import { getSecret } from "@/lib/projects"
import { runSync } from "./engine"

export type SyncOutcome = {
  ok: boolean
  runId: string
  counts?: SyncCounts
  error?: string
}

/**
 * Execute a sync for one project end to end: record a run, call the engine,
 * persist the result, and advance the schedule clock. Never throws — failures
 * are captured on the run row so the UI/cron can keep going.
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

    const [platformApiKey, framerApiKey, mappings] = await Promise.all([
      getSecret(projectId, "platformApiKey"),
      getSecret(projectId, "framerApiKey"),
      db.select().from(collectionMappings).where(eq(collectionMappings.projectId, projectId)),
    ])

    const counts = await runSync({
      project,
      platformApiKey: platformApiKey ?? "",
      framerApiKey: framerApiKey ?? "",
      mappings,
    })

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

/** Next run time for a project that just synced, given its interval. */
export function computeNextSync(intervalMinutes: number): Date {
  return new Date(Date.now() + intervalMinutes * 60_000)
}
