"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/guards"
import { getProjectById } from "@/lib/projects"
import { provisionProject } from "@/lib/provision"
import { vercelConfigured, addProjectDomain } from "@/lib/vercel"
import type { ActionState } from "./actions"

function str(form: FormData, key: string): string {
  return (form.get(key) ?? "").toString().trim()
}

/** Create/refresh the project's Vercel deploy: project + env + production deploy. */
export async function provisionAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireUser()
  if (!vercelConfigured()) {
    return { error: "VERCEL_API_TOKEN is not set on the dashboard — add it to enable provisioning." }
  }
  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }

  const result = await provisionProject(id)
  revalidatePath(`/projects/${project.slug}`)
  return result.ok ? { ok: true } : { error: result.error }
}

export type DomainState = {
  error?: string
  domain?: string
  cname?: string
  records?: Array<{ type: string; domain: string; value: string }>
}

/** Attach a custom domain (CNAME) to the project's Vercel deployment. */
export async function addDomainAction(
  _prev: DomainState,
  form: FormData
): Promise<DomainState> {
  await requireUser()
  if (!vercelConfigured()) return { error: "VERCEL_API_TOKEN is not set." }

  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }
  if (!project.vercelProjectId) {
    return { error: "Provision the deployment first, then add a domain." }
  }
  const domain = str(form, "domain").toLowerCase()
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return { error: "Enter a valid domain, e.g. withwine-dev.matey.co" }
  }

  try {
    const result = await addProjectDomain(project.vercelProjectId, domain)
    revalidatePath(`/projects/${project.slug}`)
    return {
      domain: result.name,
      // For a subdomain, point a CNAME at Vercel; for an apex use an A record.
      cname: "cname.vercel-dns.com",
      records: result.verification ?? [],
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
