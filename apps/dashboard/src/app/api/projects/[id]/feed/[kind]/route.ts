import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"
import { getProjectById, getSecret } from "@/lib/projects"
import { isFeedKind } from "@/lib/feed-kinds"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/projects/{id}/feed/{kind} — authenticated feed preview for the
 * dashboard's Feeds tab.
 *
 * Feeds now live on the project's own deployment, so this proxies
 * `<deployUrl>/api/feed/{kind}` (adding the feedKey if the feed is locked). The
 * dashboard no longer builds feeds itself.
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
  if (!project.deployUrl) {
    return NextResponse.json(
      { error: "No deployment URL set for this project yet." },
      { status: 409 }
    )
  }

  const feedKey = await getSecret(project.id, "feedKey")
  const base = project.deployUrl.replace(/\/+$/, "")
  const url = `${base}/api/feed/${params.kind}${feedKey ? `?key=${encodeURIComponent(feedKey)}` : ""}`

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }
}
