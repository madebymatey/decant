import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  collectionMappings,
  projects,
  projectSecrets,
  syncRuns,
  type Project,
  type SyncRun,
} from "@/db/schema"
import { decryptSecret, encryptSecret } from "@/lib/crypto"

export type SecretName = "platformApiKey" | "framerApiKey" | "feedKey"

export async function listProjects(): Promise<Project[]> {
  return db.select().from(projects).orderBy(desc(projects.createdAt))
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  return db.query.projects.findFirst({ where: eq(projects.slug, slug) })
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return db.query.projects.findFirst({ where: eq(projects.id, id) })
}

export async function listSyncRuns(projectId: string, limit = 10): Promise<SyncRun[]> {
  return db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.projectId, projectId))
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit)
}

export async function getMappings(projectId: string) {
  return db
    .select()
    .from(collectionMappings)
    .where(eq(collectionMappings.projectId, projectId))
}

// ── Secrets ──────────────────────────────────────────────────────────────────

export async function setSecret(
  projectId: string,
  name: SecretName,
  plaintext: string
): Promise<void> {
  const ciphertext = encryptSecret(plaintext)
  await db
    .insert(projectSecrets)
    .values({ projectId, name, ciphertext })
    .onConflictDoUpdate({
      target: [projectSecrets.projectId, projectSecrets.name],
      set: { ciphertext, updatedAt: new Date() },
    })
}

export async function getSecret(
  projectId: string,
  name: SecretName
): Promise<string | undefined> {
  const row = await db.query.projectSecrets.findFirst({
    where: and(eq(projectSecrets.projectId, projectId), eq(projectSecrets.name, name)),
  })
  return row ? decryptSecret(row.ciphertext) : undefined
}

/** Which secrets exist for a project (without decrypting), for status display. */
export async function listSecretNames(projectId: string): Promise<SecretName[]> {
  const rows = await db
    .select({ name: projectSecrets.name })
    .from(projectSecrets)
    .where(eq(projectSecrets.projectId, projectId))
  return rows.map((r) => r.name as SecretName)
}
