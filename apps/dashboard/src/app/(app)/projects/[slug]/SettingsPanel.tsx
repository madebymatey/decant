"use client"

import { useFormState } from "react-dom"
import { updateProjectAction, deleteProjectAction, type ActionState } from "../actions"
import type { Project } from "@/db/schema"
import type { SecretName } from "@/lib/projects"
import { Badge, Card, CardBody, CardHeader, Field, Input } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"

export function SettingsPanel({
  project,
  secretsSet,
}: {
  project: Project
  secretsSet: SecretName[]
}) {
  const [state, formAction] = useFormState(updateProjectAction, {} as ActionState)
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
            {state.ok ? (
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
                Saved.
              </div>
            ) : null}
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
              {(["platformApiKey", "framerApiKey", "feedKey"] as SecretName[]).map((s) =>
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
