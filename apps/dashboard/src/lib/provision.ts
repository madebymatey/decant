import "server-only"
import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { ConfigSchema } from "@decant/core"
import { db } from "@/db"
import { projects } from "@/db/schema"
import { getProjectById, getSecret, setSecret, type SecretName } from "@/lib/projects"
import {
  ensureProject,
  getProject,
  upsertEnv,
  createDeployment,
  getDeployment,
  type EnvVar,
} from "@/lib/vercel"

function genKey(): string {
  return randomBytes(24).toString("hex")
}

/** Return an existing secret, or generate + persist one. */
async function ensureSecret(projectId: string, name: SecretName): Promise<string> {
  const existing = await getSecret(projectId, name)
  if (existing) return existing
  const value = genKey()
  await setSecret(projectId, name, value)
  return value
}

/**
 * Provision (or re-provision) a project's Vercel deployment: create the Vercel
 * project from the storefront repo, push its env from decant's config + secrets,
 * and trigger a production deploy. SYNC_KEY + TOKEN_SECRET are auto-managed.
 *
 * Returns quickly — the deploy runs async; poll with refreshDeploymentStatus.
 */
export async function provisionProject(
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const project = await getProjectById(projectId)
  if (!project) return { ok: false, error: "Project not found" }

  // The deployed runtime selects its adapter from PLATFORM; reject an unknown
  // integration here rather than shipping a deploy that crash-loops at boot.
  const supportedPlatforms = ConfigSchema.shape.platform.options
  if (!supportedPlatforms.includes(project.integration as (typeof supportedPlatforms)[number])) {
    return {
      ok: false,
      error: `Unsupported integration "${project.integration}". Supported platforms: ${supportedPlatforms.join(", ")}.`,
    }
  }

  try {
    await db
      .update(projects)
      .set({ deployStatus: "provisioning" })
      .where(eq(projects.id, projectId))

    const syncKey = await ensureSecret(projectId, "syncKey")
    const tokenSecret = await ensureSecret(projectId, "tokenSecret")
    const [platformApiKey, framerApiKey, feedKey] = await Promise.all([
      getSecret(projectId, "platformApiKey"),
      getSecret(projectId, "framerApiKey"),
      getSecret(projectId, "feedKey"),
    ])

    // Create or reuse the Vercel project (named after the slug).
    const vp = await ensureProject(project.slug)
    let repoId = vp.link?.repoId
    if (!repoId) repoId = (await getProject(vp.id))?.link?.repoId
    if (!repoId) {
      throw new Error(
        "Vercel project has no linked GitHub repo. Connect the GitHub integration to team Matey."
      )
    }

    const deployUrl = `https://${vp.name}.vercel.app`

    // Build env from decant's config + secrets (only non-empty values).
    const env: EnvVar[] = []
    const add = (key: string, value: string | null | undefined) => {
      if (value != null && value !== "") env.push({ key, value: String(value) })
    }
    add("PLATFORM", project.integration)
    add("PLATFORM_API_KEY", platformApiKey)
    add("PLATFORM_STORE_ID", project.platformStoreId)
    add("PLATFORM_API_URL", project.platformApiUrl)
    add("PLATFORM_ASSET_URL", project.platformAssetUrl)
    add("PLATFORM_STOREFRONT_URL", project.platformStorefrontUrl)
    add("PLATFORM_CURRENCY", project.currency)
    add("PLATFORM_LOCALE", project.locale)
    add("FRAMER_API_KEY", framerApiKey)
    add("FRAMER_PROJECT_URL", project.framerProjectUrl)
    add("SYNC_KEY", syncKey)
    add("TOKEN_SECRET", tokenSecret)
    add("FEED_KEY", feedKey)
    // Origin gate: locked to the listed origins, else open to Framer editors.
    if (project.allowedOrigins) {
      add("ALLOWED_ORIGINS", project.allowedOrigins)
      add("ALLOW_FRAMER_EDITOR_ORIGINS", "false")
    } else {
      add("ALLOW_FRAMER_EDITOR_ORIGINS", "true")
    }
    await upsertEnv(vp.id, env)

    // Trigger the production deployment.
    const dep = await createDeployment(vp.name, repoId)

    await db
      .update(projects)
      .set({
        vercelProjectId: vp.id,
        deploymentId: dep.id,
        deployUrl,
        deployStatus: "provisioning",
      })
      .where(eq(projects.id, projectId))

    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await db.update(projects).set({ deployStatus: "error" }).where(eq(projects.id, projectId))
    return { ok: false, error }
  }
}

/** Poll the in-flight deployment and update deployStatus / lastDeployedAt. */
export async function refreshDeploymentStatus(projectId: string): Promise<void> {
  const project = await getProjectById(projectId)
  if (!project?.deploymentId) return
  try {
    const dep = await getDeployment(project.deploymentId)
    const state = dep.readyState
    const status =
      state === "READY"
        ? "ready"
        : state === "ERROR" || state === "CANCELED"
          ? "error"
          : "provisioning"
    await db
      .update(projects)
      .set({
        deployStatus: status,
        lastDeployedAt: state === "READY" ? new Date() : project.lastDeployedAt,
      })
      .where(eq(projects.id, projectId))
  } catch {
    // Transient — leave status as-is for the next poll.
  }
}
