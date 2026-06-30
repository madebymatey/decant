import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

// ── Auth.js core tables (Drizzle adapter shape) ──────────────────────────────
// The `user` table carries two extra columns the dashboard owns: `role` and
// `status`. The adapter happily ignores columns it doesn't know about.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /** 'admin' can manage access + all projects; 'member' can use projects. */
  role: text("role").notNull().default("member"),
  /** 'revoked' blocks sign-in and invalidates the session on next check. */
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// ── Access control ───────────────────────────────────────────────────────────

/** Email domains permitted to sign in (e.g. "matey.co"). */
export const allowedDomains = pgTable("allowed_domain", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  domain: text("domain").notNull().unique(),
  note: text("note"),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ── Projects ─────────────────────────────────────────────────────────────────

/** One client integration. Secrets live in `projectSecrets`, encrypted. */
export const projects = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** Stable URL key, e.g. "greenway" → decant.matey.co/greenway/api/... */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  clientName: text("clientName"),
  /** Integration type. Only 'withwine' for now. */
  integration: text("integration").notNull().default("withwine"),

  // Platform config — non-secret.
  platformStoreId: text("platformStoreId"),
  platformApiUrl: text("platformApiUrl"),
  platformAssetUrl: text("platformAssetUrl"),
  /** Public storefront base for hosted-checkout handoff (e.g. Commerce7). */
  platformStorefrontUrl: text("platformStorefrontUrl"),
  currency: text("currency").notNull().default("USD"),
  locale: text("locale").notNull().default("en-US"),

  // Framer target.
  framerProjectUrl: text("framerProjectUrl"),

  // Per-project deployment (the data plane that runs the sync + serves feeds).
  deployUrl: text("deployUrl"),
  vercelProjectId: text("vercelProjectId"),
  deploymentId: text("deploymentId"),
  deployStatus: text("deployStatus").notNull().default("none"),
  lastDeployedAt: timestamp("lastDeployedAt"),
  /** CSV of exact allowed Framer origins for the runtime CORS gate. */
  allowedOrigins: text("allowedOrigins"),

  // Scheduling.
  scheduleEnabled: boolean("scheduleEnabled").notNull().default(false),
  scheduleIntervalMinutes: integer("scheduleIntervalMinutes").notNull().default(1440),
  lastSyncAt: timestamp("lastSyncAt"),
  nextSyncAt: timestamp("nextSyncAt"),

  status: text("status").notNull().default("active"),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/** Encrypted per-project credentials (one row per named secret). */
export const projectSecrets = pgTable(
  "project_secret",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** e.g. 'platformApiKey' | 'framerApiKey' | 'feedKey'. */
    name: text("name").notNull(),
    /** AES-256-GCM, stored as `iv.tag.ciphertext` (base64 segments). */
    ciphertext: text("ciphertext").notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    uniqByName: unique().on(t.projectId, t.name),
  })
)

/** A field-type override for a Framer CMS field within a collection mapping. */
export type FieldOverride = {
  /** Field name as it appears in Framer, e.g. "Wine Type". */
  field: string
  /** Framer field type to force. */
  type:
    | "string"
    | "number"
    | "boolean"
    | "image"
    | "formattedText"
    | "collectionReference"
    | "multiCollectionReference"
  /** Whether to include this field at all. */
  enabled: boolean
}

/**
 * Declares which Framer CMS collection a source feed syncs into, plus optional
 * per-field type overrides (e.g. force "Varietal" to multiCollectionReference).
 */
export const collectionMappings = pgTable(
  "collection_mapping",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Source feed key: 'products' | 'wineTypes' | 'varietals' | 'vintage' | 'region'. */
    source: text("source").notNull(),
    /** Target Framer collection name (the durable contract). */
    framerCollectionName: text("framerCollectionName").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    fieldOverrides: jsonb("fieldOverrides").$type<FieldOverride[]>().notNull().default([]),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    uniqBySource: unique().on(t.projectId, t.source),
  })
)

/** A discrete sync attempt, for history + "last synced" + activity feed. */
export type SyncCounts = {
  added: number
  updated: number
  deleted: number
  failed: number
  skipped: number
}

export const syncRuns = pgTable("sync_run", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  /** 'manual' | 'scheduled'. */
  trigger: text("trigger").notNull(),
  /** 'running' | 'success' | 'failed'. */
  status: text("status").notNull().default("running"),
  startedAt: timestamp("startedAt").notNull().defaultNow(),
  finishedAt: timestamp("finishedAt"),
  durationMs: integer("durationMs"),
  counts: jsonb("counts").$type<SyncCounts>(),
  error: text("error"),
  triggeredBy: text("triggeredBy"),
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type SyncRun = typeof syncRuns.$inferSelect
export type CollectionMapping = typeof collectionMappings.$inferSelect
export type DbUser = typeof users.$inferSelect
