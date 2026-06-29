import { NextResponse, type NextRequest } from "next/server"
import { and, eq, isNull, lte, or } from "drizzle-orm"
import { db } from "@/db"
import { projects } from "@/db/schema"
import { executeSync } from "@/lib/sync/run"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/tick — the single scheduled entrypoint (Vercel Cron).
 *
 * Per-project intervals can't live in vercel.json (it's static), so this wakes
 * up on a fixed cadence and runs whichever projects are due: scheduleEnabled and
 * nextSyncAt in the past (or unset). Vercel sends `Authorization: Bearer
 * <CRON_SECRET>` automatically; we reject anything else when the secret is set.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const now = new Date()
  const due = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(
      and(
        eq(projects.scheduleEnabled, true),
        eq(projects.status, "active"),
        or(isNull(projects.nextSyncAt), lte(projects.nextSyncAt, now))
      )
    )

  const results = []
  for (const p of due) {
    const outcome = await executeSync(p.id, "scheduled")
    results.push({ slug: p.slug, ok: outcome.ok, error: outcome.error })
  }

  return NextResponse.json({ ok: true, ran: results.length, results })
}
