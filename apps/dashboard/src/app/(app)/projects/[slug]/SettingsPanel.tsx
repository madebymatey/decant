"use client"

import { useFormState } from "react-dom"
import { updateProjectAction, deleteProjectAction, type ActionState } from "../actions"
import type { Project } from "@/db/schema"
import type { SecretName } from "@/lib/projects"
import { Badge, Card, CardBody, CardHeader, Field, Input } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"
import { useActionToast } from "@/components/Toast"

export function SettingsPanel({
  project,
  secretsSet,
}: {
  project: Project
  secretsSet: SecretName[]
}) {
  const [state, formAction] = useFormState(updateProjectAction, {} as ActionState)
  useActionToast(state, { success: "Settings saved" })
  const has = (s: SecretName) => secretsSet.includes(s)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Configuration</h2>
          <p className="mt-0.5 text-xs text-muted">
            Editable here and applied to the next sync. Leave secret fields blank to keep the
            existing value.
          </p>
        </CardHeader>
        <form action={formAction}>
          <CardBody className="space-y-4">
            {state.error ? (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {state.error}
              </div>
            ) : null}

            <input type="hidden" name="projectId" value={project.id} />

            <Field label="Name">
              <Input name="name" defaultValue={project.name} />
            </Field>
            <Field label="Client name">
              <Input name="clientName" defaultValue={project.clientName ?? ""} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand / store ID">
                <Input name="platformStoreId" defaultValue={project.platformStoreId ?? ""} />
              </Field>
              <Field label="API base URL">
                <Input name="platformApiUrl" defaultValue={project.platformApiUrl ?? ""} />
              </Field>
              <Field label="Asset base URL">
                <Input name="platformAssetUrl" defaultValue={project.platformAssetUrl ?? ""} />
              </Field>
              <Field label="Framer project URL">
                <Input name="framerProjectUrl" defaultValue={project.framerProjectUrl ?? ""} />
              </Field>
              <Field label="Currency">
                <Input name="currency" defaultValue={project.currency} />
              </Field>
              <Field label="Locale">
                <Input name="locale" defaultValue={project.locale} />
              </Field>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-[13px] font-medium text-muted">Deployment</p>
              <Field
                label="Deploy URL"
                hint="The project's own deployment that runs the sync + serves feeds. Auto-set when you provision from the Deploy tab."
              >
                <Input
                  name="deployUrl"
                  defaultValue={project.deployUrl ?? ""}
                  placeholder="https://withwine-dev.vercel.app"
                />
              </Field>
              <Field
                label="Allowed origins"
                hint="CSV of Framer site origins allowed to call the runtime (CORS). Blank = allow Framer editor/preview. Pushed to the deploy on provision."
              >
                <Input
                  name="allowedOrigins"
                  defaultValue={project.allowedOrigins ?? ""}
                  placeholder="https://withwine.framer.website"
                />
              </Field>
              <Field
                label="Sync key"
                hint={has("syncKey") ? "Set — leave blank to keep." : "Not set."}
              >
                <Input name="syncKey" type="password" placeholder="••••••••" />
              </Field>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <Field
                label="WithWine client ID"
                hint={has("platformApiKey") ? "Set — leave blank to keep." : "Not set."}
              >
                <Input name="platformApiKey" type="password" placeholder="••••••••" />
              </Field>
              <Field
                label="Framer API key"
                hint={has("framerApiKey") ? "Set — leave blank to keep." : "Not set."}
              >
                <Input name="framerApiKey" type="password" placeholder="••••••••" />
              </Field>
              <Field
                label="Feed key"
                hint={has("feedKey") ? "Set — leave blank to keep." : "Not set (feeds are open)."}
              >
                <Input name="feedKey" type="password" placeholder="••••••••" />
              </Field>
            </div>
          </CardBody>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <div className="flex gap-1.5">
              {(["platformApiKey", "framerApiKey", "feedKey", "syncKey"] as SecretName[]).map((s) =>
                has(s) ? (
                  <Badge key={s} tone="success">
                    {s}
                  </Badge>
                ) : null
              )}
            </div>
            <SubmitButton variant="primary" pendingLabel="Saving…">
              Save changes
            </SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="border-danger/30">
        <CardHeader className="border-danger/20">
          <h2 className="text-sm font-medium text-danger">Danger zone</h2>
          <p className="mt-0.5 text-xs text-muted">
            Deletes the project, its secrets, mappings and sync history. The Framer collections are
            left untouched.
          </p>
        </CardHeader>
        <form action={deleteProjectAction} className="flex items-center justify-between px-5 py-4">
          <input type="hidden" name="projectId" value={project.id} />
          <span className="text-sm text-muted">This cannot be undone.</span>
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete project
          </SubmitButton>
        </form>
      </Card>
    </div>
  )
}
