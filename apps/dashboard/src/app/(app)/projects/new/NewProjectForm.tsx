"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { createProjectAction, type ActionState } from "../actions"
import { toSlug } from "@/lib/slug"
import {
  INTEGRATIONS,
  INTEGRATION_LIST,
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  type IntegrationDescriptor,
  type IntegrationId,
} from "@/lib/integrations"
import { Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui"
import { useActionToast } from "@/components/Toast"

const initial: ActionState = {}

export function NewProjectForm() {
  const [state, formAction] = useFormState(createProjectAction, initial)
  useActionToast(state)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [integration, setIntegration] = useState<IntegrationId>("withwine")

  const effectiveSlug = slugEdited ? slug : toSlug(name)

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {state.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Project</h2>
          <p className="mt-0.5 text-xs text-muted">Per-client. Title, slug and integration.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Name" hint="Display name, e.g. “Greenway Wines”.">
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Greenway Wines"
              required
            />
          </Field>
          <Field label="Slug" hint={`URL key — decant.matey.co/${effectiveSlug || "slug"}/api/...`}>
            <Input
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugEdited(true)
                setSlug(toSlug(e.target.value))
              }}
              placeholder="greenway"
            />
          </Field>
          <Field label="Client name" hint="Optional — the winery / customer.">
            <Input name="clientName" placeholder="Greenway Estate" />
          </Field>
          <Field label="Integration">
            <select
              name="integration"
              value={integration}
              onChange={(e) => setIntegration(e.target.value as IntegrationId)}
              className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-sm"
            >
              {INTEGRATION_LIST.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>
        </CardBody>
      </Card>

      {/* Remounts on integration change so placeholders + defaults refresh. */}
      <CatalogSection key={integration} descriptor={INTEGRATIONS[integration]} />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Framer</h2>
          <p className="mt-0.5 text-xs text-muted">Where the catalog syncs to.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Framer project URL" hint="e.g. https://framer.com/projects/Site--aabb1122">
            <Input name="framerProjectUrl" placeholder="https://framer.com/projects/…" />
          </Field>
          <Field label="Framer API key" hint="From Framer → project settings.">
            <Input name="framerApiKey" type="password" placeholder="ap_…" />
          </Field>
          <Field label="Feed key (optional)" hint="Protects the deploy's /api/feed/* if set.">
            <Input name="feedKey" type="password" placeholder="optional shared secret" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Deployment</h2>
          <p className="mt-0.5 text-xs text-muted">
            The project&apos;s own deployment that runs the sync and serves feeds. You can fill
            this in later from Settings.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Deploy URL" hint="e.g. https://withwine-dev.vercel.app">
            <Input name="deployUrl" placeholder="https://withwine-dev.vercel.app" />
          </Field>
          <Field label="Sync key" hint="The SYNC_KEY set on that deployment — used to trigger syncs.">
            <Input name="syncKey" type="password" placeholder="shared secret" />
          </Field>
        </CardBody>
      </Card>

      <SubmitBar />
    </form>
  )
}

function CatalogSection({ descriptor }: { descriptor: IntegrationDescriptor }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">{descriptor.catalogHeading}</h2>
        <p className="mt-0.5 text-xs text-muted">
          Credentials are encrypted at rest and never shown again.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label={descriptor.storeId.label} hint={descriptor.storeId.hint}>
          <Input name="platformStoreId" placeholder={descriptor.storeId.placeholder} />
        </Field>
        <Field label={descriptor.apiKey.label} hint={descriptor.apiKey.hint}>
          <Input name="platformApiKey" type="password" placeholder={descriptor.apiKey.placeholder} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={descriptor.apiUrl.label} hint={descriptor.apiUrl.hint}>
            <Input name="platformApiUrl" placeholder={descriptor.apiUrl.placeholder} />
          </Field>
          <Field label={descriptor.assetUrl.label} hint={descriptor.assetUrl.hint}>
            <Input name="platformAssetUrl" placeholder={descriptor.assetUrl.placeholder} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <Select name="currency" defaultValue={descriptor.defaults.currency}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Locale">
            <Select name="locale" defaultValue={descriptor.defaults.locale}>
              {LOCALE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </CardBody>
    </Card>
  )
}

function SubmitBar() {
  const { pending } = useFormStatus()
  return (
    <div className="flex items-center justify-end gap-3">
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </div>
  )
}
