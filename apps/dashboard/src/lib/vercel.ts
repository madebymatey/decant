import "server-only"

/**
 * Thin Vercel REST API client for auto-provisioning per-project deployments.
 *
 * Auth: VERCEL_API_TOKEN (team-scoped). VERCEL_TEAM_ID scopes every call to the
 * Matey team. Only the few endpoints we need — create project, push env, deploy,
 * read deployment status, attach a domain.
 */

const API = "https://api.vercel.com"

function config(): { token: string; teamId?: string } {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new Error("VERCEL_API_TOKEN is not set")
  return { token, teamId: process.env.VERCEL_TEAM_ID || undefined }
}

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN)
}

async function vercelFetch<T = any>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  const { token, teamId } = config()
  const url = new URL(API + path)
  if (teamId) url.searchParams.set("teamId", teamId)
  for (const [k, v] of Object.entries(init?.query ?? {})) url.searchParams.set(k, v)

  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(45_000),
  })
  const text = await res.text()
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.code || `${res.status} ${res.statusText}`
    throw new Error(`Vercel API: ${msg}`)
  }
  return json as T
}

// ── Repo (constant: all per-project deploys come from this repo) ───────────────

export const STOREFRONT_REPO = process.env.VERCEL_STOREFRONT_REPO ?? "madebymatey/decant"
export const STOREFRONT_ROOT_DIR =
  process.env.VERCEL_STOREFRONT_ROOT_DIR ?? "apps/template-withwine"
export const STOREFRONT_REF = process.env.VERCEL_STOREFRONT_REF ?? "main"

// ── Projects ──────────────────────────────────────────────────────────────────

export type VercelProject = {
  id: string
  name: string
  link?: { repoId?: number; type?: string }
}

export async function getProject(nameOrId: string): Promise<VercelProject | null> {
  try {
    return await vercelFetch<VercelProject>(`/v9/projects/${encodeURIComponent(nameOrId)}`)
  } catch {
    return null
  }
}

export async function createProject(name: string): Promise<VercelProject> {
  return vercelFetch<VercelProject>("/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      framework: "nextjs",
      rootDirectory: STOREFRONT_ROOT_DIR,
      gitRepository: { type: "github", repo: STOREFRONT_REPO },
    }),
  })
}

/** Create the project if it doesn't exist; return it either way. */
export async function ensureProject(name: string): Promise<VercelProject> {
  return (await getProject(name)) ?? (await createProject(name))
}

// ── Env vars ──────────────────────────────────────────────────────────────────

export type EnvVar = { key: string; value: string }

export async function upsertEnv(
  projectId: string,
  vars: EnvVar[],
  target: string[] = ["production", "preview", "development"]
): Promise<void> {
  if (vars.length === 0) return
  await vercelFetch(`/v10/projects/${projectId}/env`, {
    method: "POST",
    query: { upsert: "true" },
    body: JSON.stringify(
      vars.map((v) => ({ key: v.key, value: v.value, type: "encrypted", target }))
    ),
  })
}

// ── Deployments ───────────────────────────────────────────────────────────────

export type Deployment = {
  id: string
  url?: string
  readyState?: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "INITIALIZING"
  alias?: string[]
}

export async function createDeployment(
  projectName: string,
  repoId: number
): Promise<Deployment> {
  return vercelFetch<Deployment>("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      target: "production",
      gitSource: { type: "github", repoId, ref: STOREFRONT_REF },
    }),
  })
}

export async function getDeployment(id: string): Promise<Deployment> {
  return vercelFetch<Deployment>(`/v13/deployments/${id}`)
}

// ── Domains ───────────────────────────────────────────────────────────────────

export type DomainResult = {
  name: string
  verified: boolean
  verification?: Array<{ type: string; domain: string; value: string }>
}

export async function addProjectDomain(
  projectId: string,
  name: string
): Promise<DomainResult> {
  return vercelFetch<DomainResult>(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}
