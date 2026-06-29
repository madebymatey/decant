import { NextResponse, type NextRequest } from "next/server"
import { getProjectBySlug, getSecret } from "@/lib/projects"
import { buildFeed, isFeedKind } from "@/lib/feeds"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /{slug}/api/feed/{kind}
 *
 * Read-only catalog feeds for a project — consumed by Framer's CMS sync and by
 * the dashboard's feed viewer. If the project has a `feedKey` secret set, the
 * caller must present it as `?key=` or `Authorization: Bearer <key>`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; kind: string } }
): Promise<NextResponse> {
  const kind = params.kind.replace(/\.json$/, "")
  if (!isFeedKind(kind)) {
    return NextResponse.json({ error: "Unknown feed" }, { status: 404 })
  }

  const project = await getProjectBySlug(params.slug)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Optional shared-secret gate.
  const feedKey = await getSecret(project.id, "feedKey")
  if (feedKey) {
    const provided =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      req.nextUrl.searchParams.get("key") ??
      undefined
    if (provided !== feedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const platformApiKey = await getSecret(project.id, "platformApiKey")
  if (!platformApiKey) {
    return NextResponse.json({ error: "Project has no platform API key" }, { status: 409 })
  }

  try {
    const data = await buildFeed(project, platformApiKey, kind)
    return NextResponse.json(data, {
      headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
