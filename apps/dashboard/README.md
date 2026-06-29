# Decant Dashboard

The control plane for Decant — a Vercel-style admin at **decant.matey.co** to
create and manage per-client sync projects (WithWine → Framer CMS), trigger and
schedule syncs, inspect feeds, and configure Framer collection mappings.

It does **not** replace the per-client storefront deploys. It owns project
config + credentials + scheduling, runs the sync engine, and serves read-only
per-project feeds at `/{slug}/api/feed/*`.

## Stack

- Next.js 14 (App Router) + Tailwind + Geist
- Auth.js (NextAuth v5) — Google SSO, domain allowlist, admin role, revoke
- Neon Postgres + Drizzle ORM
- Sync engine reuses `@decant/core`, `@decant/adapter-withwine`, `@decant/framer`
  via `framer-api`

## Local setup

1. `cp .env.example .env` and fill it in:
   - **`DATABASE_URL`** — Neon pooled connection string.
   - **`AUTH_SECRET`** — `openssl rand -base64 32`.
   - **`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`** — Google OAuth client. Authorized
     redirect URI: `http://localhost:3000/api/auth/callback/google` (dev) and
     `https://decant.matey.co/api/auth/callback/google` (prod).
   - **`BOOTSTRAP_ADMIN_EMAIL`** — your email. Always allowed in; force-promoted
     to admin on first login so you can bootstrap before any domain is allowlisted.
   - **`SECRETS_ENCRYPTION_KEY`** — `openssl rand -hex 32`. Encrypts project
     credentials at rest. **Rotating this invalidates stored secrets.**
   - **`CRON_SECRET`** — `openssl rand -hex 32`. Auths the scheduled tick.
2. Push the schema to Neon: `pnpm db:push` (or `pnpm db:migrate` to apply the
   generated SQL migrations in `./drizzle`).
3. `pnpm dev` and open http://localhost:3000. Sign in with the bootstrap admin,
   then add allowed domains under **Access**.

## How it fits together

- **Access control** — `signIn` is gated by `canSignIn`: bootstrap admin always
  allowed; revoked users always denied; otherwise the email domain must be on the
  allowlist. Revoking a user flips their status and deletes their sessions.
- **Projects** — one row per client. Non-secret config on `project`; credentials
  encrypted in `project_secret`. Each project gets a stable `slug`.
- **Feeds** — `GET /{slug}/api/feed/{products|wine-types|varietals|vintage|region}`
  are the read-only URLs Framer's CMS sync pulls from. Optionally gated by a
  `feedKey` secret. The dashboard previews them via the authenticated
  `/api/projects/{id}/feed/{kind}` route (bypasses the feed key).
- **Sync** — `src/lib/sync/engine.ts` is the config-driven, multi-tenant version
  of the single-tenant engine in `apps/template-withwine`. Collection names and
  reference-field cardinality (single vs multi) come from `collection_mapping`.
- **Scheduling** — per-project intervals can't live in `vercel.json`, so a single
  cron (`*/15 * * * *` → `/api/cron/tick`) runs whichever projects are due.

## Deploy (Vercel)

Create a separate Vercel project on the **Matey** team with **Root Directory =
`apps/dashboard`**, domain `decant.matey.co`. Set all `.env` vars as project env
vars. `vercel.json` wires the install/build (workspace-aware) and the tick cron.
