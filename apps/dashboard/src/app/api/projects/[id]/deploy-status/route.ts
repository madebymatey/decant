import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"
import { getProjectById } from "@/lib/projects"
import { refreshDeploymentStatus } from "@/lib/provision"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/projects/{id}/deploy-status — polls Vercel for the in-flight
 * deployment and returns the latest status. Used by the Deploy tab to live-update
 * while a provision is building.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user || session.user.status === "revoked") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await refreshDeploymentStatus(params.id)
  const project = await getProjectById(params.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    deployStatus: project.deployStatus,
    deployUrl: project.deployUrl,
  })
}
