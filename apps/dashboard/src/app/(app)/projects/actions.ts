"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { projects, collectionMappings, type FieldOverride } from "@/db/schema"
import { requireUser } from "@/lib/guards"
import { getProjectById, getProjectBySlug, setSecret, type SecretName } from "@/lib/projects"
import { executeSync, computeNextSync } from "@/lib/sync/run"
import { isValidSlug, toSlug } from "@/lib/slug"
import { isFramerProjectUrl, normalizeFramerProjectUrl } from "@/lib/framer-url"

function str(form: FormData, key: string): string {
  return (form.get(key) ?? "").toString().trim()
}

export type ActionState = { error?: string; ok?: boolean; message?: string }

// ── Create ────────────────────────────────────────────────────────────────────

export async function createProjectAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const session = await requireUser()

  const name = str(form, "name")
  if (!name) return { error: "Name is required." }

  const slug = str(form, "slug") || toSlug(name)
  if (!isValidSlug(slug)) {
    return { error: "Slug must be lowercase letters, numbers and dashes, and not reserved." }
  }
  if (await getProjectBySlug(slug)) {
    return { error: `A project with slug "${slug}" already exists.` }
  }

  const framerProjectUrl = normalizeFramerProjectUrl(str(form, "framerProjectUrl"))
  if (framerProjectUrl && !isFramerProjectUrl(framerProjectUrl)) {
    return { error: "Framer project URL must look like https://framer.com/projects/<Name>--<ID>." }
  }

  const platformApiKey = str(form, "platformApiKey")
  const framerApiKey = str(form, "framerApiKey")
  const feedKey = str(form, "feedKey")
  const syncKey = str(form, "syncKey")
  const deployUrl = str(form, "deployUrl").replace(/\/+$/, "")

  const [created] = await db
    .insert(projects)
    .values({
      slug,
      name,
      clientName: str(form, "clientName") || null,
      integration: "withwine",
      platformStoreId: str(form, "platformStoreId") || null,
      platformApiUrl: str(form, "platformApiUrl") || null,
      platformAssetUrl: str(form, "platformAssetUrl") || null,
      currency: str(form, "currency") || "USD",
      locale: str(form, "locale") || "en-US",
      framerProjectUrl: framerProjectUrl || null,
      deployUrl: deployUrl || null,
      allowedOrigins: str(form, "allowedOrigins") || null,
      createdBy: session.user.email ?? session.user.id,
    })
    .returning({ id: projects.id })

  if (platformApiKey) await setSecret(created.id, "platformApiKey", platformApiKey)
  if (framerApiKey) await setSecret(created.id, "framerApiKey", framerApiKey)
  if (feedKey) await setSecret(created.id, "feedKey", feedKey)
  if (syncKey) await setSecret(created.id, "syncKey", syncKey)

  revalidatePath("/")
  redirect(`/projects/${slug}`)
}

// ── Update config ─────────────────────────────────────────────────────────────

export async function updateProjectAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireUser()
  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }

  const framerProjectUrl = normalizeFramerProjectUrl(str(form, "framerProjectUrl"))
  if (framerProjectUrl && !isFramerProjectUrl(framerProjectUrl)) {
    return { error: "Framer project URL must look like https://framer.com/projects/<Name>--<ID>." }
  }

  await db
    .update(projects)
    .set({
      name: str(form, "name") || project.name,
      clientName: str(form, "clientName") || null,
      platformStoreId: str(form, "platformStoreId") || null,
      platformApiUrl: str(form, "platformApiUrl") || null,
      platformAssetUrl: str(form, "platformAssetUrl") || null,
      currency: str(form, "currency") || "USD",
      locale: str(form, "locale") || "en-US",
      framerProjectUrl: framerProjectUrl || null,
      deployUrl: str(form, "deployUrl").replace(/\/+$/, "") || null,
      allowedOrigins: str(form, "allowedOrigins") || null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))

  // Only overwrite secrets when a new value is supplied.
  for (const name of ["platformApiKey", "framerApiKey", "feedKey", "syncKey"] as SecretName[]) {
    const v = str(form, name)
    if (v) await setSecret(id, name, v)
  }

  revalidatePath(`/projects/${project.slug}`)
  return { ok: true }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function updateScheduleAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireUser()
  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }

  const enabled = form.get("scheduleEnabled") === "on"
  // Floor is daily: the Vercel cron tick only runs once a day (see vercel.json).
  const intervalMinutes = Math.max(1440, Number(str(form, "scheduleIntervalMinutes")) || 1440)

  await db
    .update(projects)
    .set({
      scheduleEnabled: enabled,
      scheduleIntervalMinutes: intervalMinutes,
      nextSyncAt: enabled ? computeNextSync(intervalMinutes) : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))

  revalidatePath(`/projects/${project.slug}`)
  return { ok: true }
}

// ── Manual sync ───────────────────────────────────────────────────────────────

export async function syncNowAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const session = await requireUser()
  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }

  const outcome = await executeSync(id, "manual", session.user.email ?? session.user.id)
  revalidatePath(`/projects/${project.slug}`)

  if (!outcome.ok) return { error: outcome.error ?? "Sync failed." }
  const c = outcome.counts
  const message = c
    ? `Sync complete — ${c.added} added, ${c.updated} updated, ${c.deleted} deleted`
    : "Sync complete"
  return { ok: true, message }
}

// ── Collection mapping ────────────────────────────────────────────────────────

export async function saveMappingAction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireUser()
  const id = str(form, "projectId")
  const project = await getProjectById(id)
  if (!project) return { error: "Project not found." }

  const source = str(form, "source")
  const framerCollectionName = str(form, "framerCollectionName")
  if (!source || !framerCollectionName) return { error: "Source and collection name are required." }

  let fieldOverrides: FieldOverride[] = []
  const raw = str(form, "fieldOverrides")
  if (raw) {
    try {
      fieldOverrides = JSON.parse(raw) as FieldOverride[]
    } catch {
      return { error: "Field overrides must be valid JSON." }
    }
  }

  await db
    .insert(collectionMappings)
    .values({ projectId: id, source, framerCollectionName, fieldOverrides })
    .onConflictDoUpdate({
      target: [collectionMappings.projectId, collectionMappings.source],
      set: { framerCollectionName, fieldOverrides, updatedAt: new Date() },
    })

  revalidatePath(`/projects/${project.slug}`)
  return { ok: true }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteProjectAction(form: FormData): Promise<void> {
  await requireUser()
  const id = str(form, "projectId")
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath("/")
  redirect("/")
}
