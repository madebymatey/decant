import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"
import { getProjectById, getSecret } from "@/lib/projects"
import { buildFeed, isFeedKind } from "@/lib/feeds"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/projects/{id}/feed/{kind} — authenticated feed preview for the
 * dashboard's viewer. Unlike the public /{slug}/api/feed route, this bypasses
 * the feedKey gate (the caller is a signed-in dashboard user) so previews work
 * even when a feed is locked down.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; kind: string } }
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user || session.user.status === "revoked") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isFeedKind(params.kind)) {
    return NextResponse.json({ error: "Unknown feed" }, { status: 404 })
  }

  const project = await getProjectById(params.id)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const platformApiKey = await getSecret(project.id, "platformApiKey")
  if (!platformApiKey) {
    return NextResponse.json({ error: "Project has no platform API key" }, { status: 409 })
  }

  try {
    const data = await buildFeed(project, platformApiKey, params.kind)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }
}
