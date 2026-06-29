"use client"

import { useMemo, useState } from "react"
import { useFormState } from "react-dom"
import { saveMappingAction, type ActionState } from "../actions"
import type { CollectionMapping, FieldOverride, Project } from "@/db/schema"
import { Card, CardBody, CardHeader, Field, Input } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"

const PRODUCT_REF_FIELDS = ["Wine Type", "Varietal", "Vintage", "Region"] as const

const OPTION_SOURCES: { source: string; label: string; defaultName: string }[] = [
  { source: "wineTypes", label: "Wine Types", defaultName: "Wine Types" },
  { source: "varietals", label: "Varietals", defaultName: "Varietals" },
  { source: "vintage", label: "Vintage", defaultName: "Vintage" },
  { source: "region", label: "Region", defaultName: "Region" },
]

function mappingFor(mappings: CollectionMapping[], source: string) {
  return mappings.find((m) => m.source === source)
}

export function CollectionsPanel({
  project,
  mappings,
}: {
  project: Project
  mappings: CollectionMapping[]
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Framer collections</h2>
          <p className="mt-0.5 text-xs text-muted">
            Declare the collection each feed syncs into and how reference fields are typed. The
            engine creates/updates these collections on the next sync.
          </p>
        </CardHeader>
      </Card>

      <ProductsMappingForm project={project} mapping={mappingFor(mappings, "products")} />

      {OPTION_SOURCES.map((o) => (
        <OptionMappingForm
          key={o.source}
          project={project}
          source={o.source}
          label={o.label}
          defaultName={mappingFor(mappings, o.source)?.framerCollectionName ?? o.defaultName}
        />
      ))}
    </div>
  )
}

function ProductsMappingForm({
  project,
  mapping,
}: {
  project: Project
  mapping?: CollectionMapping
}) {
  const [state, formAction] = useFormState(saveMappingAction, {} as ActionState)
  const initialOverrides = useMemo(() => {
    const map = new Map<string, FieldOverride>()
    for (const o of mapping?.fieldOverrides ?? []) map.set(o.field, o)
    return map
  }, [mapping])

  const [refs, setRefs] = useState<Record<string, "collectionReference" | "multiCollectionReference">>(
    () =>
      Object.fromEntries(
        PRODUCT_REF_FIELDS.map((f) => [
          f,
          initialOverrides.get(f)?.type === "multiCollectionReference"
            ? "multiCollectionReference"
            : "collectionReference",
        ])
      )
  )

  const fieldOverrides: FieldOverride[] = PRODUCT_REF_FIELDS.map((f) => ({
    field: f,
    type: refs[f],
    enabled: true,
  }))

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Products</h2>
        <p className="mt-0.5 text-xs text-muted">The main collection plus its reference fields.</p>
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
          <input type="hidden" name="source" value="products" />
          <input type="hidden" name="fieldOverrides" value={JSON.stringify(fieldOverrides)} />

          <Field label="Framer collection name">
            <Input
              name="framerCollectionName"
              defaultValue={mapping?.framerCollectionName ?? "Products"}
              placeholder="Products"
            />
          </Field>

          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">Reference fields</p>
            <div className="divide-y divide-border rounded-md border border-border">
              {PRODUCT_REF_FIELDS.map((f) => (
                <div key={f} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm">{f}</span>
                  <select
                    value={refs[f]}
                    onChange={(e) =>
                      setRefs((r) => ({
                        ...r,
                        [f]: e.target.value as "collectionReference" | "multiCollectionReference",
                      }))
                    }
                    className="h-8 rounded-md border border-border-strong bg-background px-2 text-xs"
                  >
                    <option value="collectionReference">Single reference</option>
                    <option value="multiCollectionReference">Multi reference</option>
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-subtle">
              Changing a field&apos;s type recreates it in Framer on the next sync.
            </p>
          </div>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <SubmitButton variant="primary" pendingLabel="Saving…">
            Save mapping
          </SubmitButton>
        </div>
      </form>
    </Card>
  )
}

function OptionMappingForm({
  project,
  source,
  label,
  defaultName,
}: {
  project: Project
  source: string
  label: string
  defaultName: string
}) {
  const [state, formAction] = useFormState(saveMappingAction, {} as ActionState)
  return (
    <Card>
      <form action={formAction}>
        <div className="flex items-end gap-3 px-5 py-4">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="source" value={source} />
          <div className="flex-1">
            <Field label={`${label} collection`}>
              <Input name="framerCollectionName" defaultValue={defaultName} placeholder={label} />
            </Field>
          </div>
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Save
          </SubmitButton>
        </div>
        {state.error ? (
          <p className="px-5 pb-3 text-xs text-danger">{state.error}</p>
        ) : null}
      </form>
    </Card>
  )
}
