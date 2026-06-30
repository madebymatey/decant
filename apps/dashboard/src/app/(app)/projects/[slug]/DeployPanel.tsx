"use client"

import { useEffect, useState } from "react"
import { useFormState } from "react-dom"
import { CheckCircle2, AlertCircle, Loader2, Rocket, ExternalLink, Copy, Check } from "lucide-react"
import type { Project } from "@/db/schema"
import {
  provisionAction,
  addDomainAction,
  type DomainState,
} from "../deploy-actions"
import type { ActionState } from "../actions"
import { Badge, Button, Card, CardBody, CardHeader, Field, Input } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"

type Status = "none" | "provisioning" | "ready" | "error"

export function DeployPanel({
  project,
  vercelConfigured,
}: {
  project: Project
  vercelConfigured: boolean
}) {
  const [status, setStatus] = useState<Status>((project.deployStatus as Status) ?? "none")
  const [url, setUrl] = useState<string | null>(project.deployUrl)
  const [provisionState, provision] = useFormState(provisionAction, {} as ActionState)
  const [domainState, addDomain] = useFormState(addDomainAction, {} as DomainState)
  const [copied, setCopied] = useState(false)

  // Optimistically flip to "provisioning" once the action succeeds.
  useEffect(() => {
    if (provisionState.ok) setStatus("provisioning")
  }, [provisionState.ok])

  // Live-poll while a deploy is building.
  useEffect(() => {
    if (status !== "provisioning") return
    let active = true
    const tick = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/deploy-status`)
        const json = await res.json()
        if (!active) return
        if (json.deployStatus) setStatus(json.deployStatus as Status)
        if (json.deployUrl) setUrl(json.deployUrl)
      } catch {
        /* keep polling */
      }
    }
    const interval = setInterval(tick, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [status, project.id])

  const deployed = status === "ready" || Boolean(project.vercelProjectId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Deployment</h2>
              <p className="mt-0.5 text-xs text-muted">
                decant creates the project&apos;s own Vercel deployment, pushes its env, and ships
                it. SYNC_KEY and TOKEN_SECRET are generated for you.
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {!vercelConfigured ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              Set <span className="font-mono">VERCEL_API_TOKEN</span> on the dashboard to enable
              one-click provisioning.
            </div>
          ) : null}
          {provisionState.error ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {provisionState.error}
            </div>
          ) : null}

          {url ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-mono text-[13px] text-foreground hover:underline"
              >
                {url}
                <ExternalLink size={13} className="text-muted" />
              </a>
              {status === "ready" ? (
                <span className="text-xs text-success">live</span>
              ) : status === "provisioning" ? (
                <span className="text-xs text-muted">building…</span>
              ) : null}
            </div>
          ) : null}

          <form action={provision} className="flex items-center justify-between">
            <input type="hidden" name="projectId" value={project.id} />
            <span className="text-xs text-muted">
              {deployed
                ? "Re-pushes env from current config and ships a new build."
                : "Creates the Vercel project and ships the first build."}
            </span>
            <SubmitButton
              variant="primary"
              pendingLabel={deployed ? "Redeploying…" : "Provisioning…"}
              disabled={!vercelConfigured || status === "provisioning"}
            >
              <Rocket size={15} />
              {deployed ? "Redeploy" : "Provision deploy"}
            </SubmitButton>
          </form>
        </CardBody>
      </Card>

      {/* Custom domain */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Custom domain (optional)</h2>
          <p className="mt-0.5 text-xs text-muted">
            Attach a domain like <span className="font-mono">withwine-dev.matey.co</span> and point
            a CNAME at Vercel. The default <span className="font-mono">{"<slug>"}.vercel.app</span>{" "}
            keeps working.
          </p>
        </CardHeader>
        <form action={addDomain}>
          <CardBody className="space-y-3">
            {domainState.error ? (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {domainState.error}
              </div>
            ) : null}
            {domainState.domain ? (
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-[13px]">
                <p className="text-success">Added {domainState.domain}. Create this DNS record:</p>
                <CnameRow
                  host={domainState.domain}
                  value={domainState.cname ?? "cname.vercel-dns.com"}
                  copied={copied}
                  onCopy={() => {
                    navigator.clipboard.writeText(domainState.cname ?? "cname.vercel-dns.com")
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1200)
                  }}
                />
                {(domainState.records ?? []).map((r, i) => (
                  <p key={i} className="mt-1 font-mono text-xs text-muted">
                    {r.type} {r.domain} → {r.value}
                  </p>
                ))}
              </div>
            ) : null}

            <input type="hidden" name="projectId" value={project.id} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Domain">
                  <Input name="domain" placeholder="withwine-dev.matey.co" />
                </Field>
              </div>
              <SubmitButton variant="secondary" pendingLabel="Adding…" disabled={!project.vercelProjectId}>
                Add domain
              </SubmitButton>
            </div>
            {!project.vercelProjectId ? (
              <p className="text-xs text-subtle">Provision the deployment first.</p>
            ) : null}
          </CardBody>
        </form>
      </Card>
    </div>
  )
}

function CnameRow({
  host,
  value,
  copied,
  onCopy,
}: {
  host: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5">
      <span className="truncate font-mono text-xs text-foreground">
        CNAME&nbsp;&nbsp;{host}&nbsp;→&nbsp;{value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="flex h-6 shrink-0 items-center gap-1 rounded border border-border-strong px-1.5 text-xs text-muted hover:text-foreground"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ready")
    return (
      <Badge tone="success">
        <CheckCircle2 size={12} /> Ready
      </Badge>
    )
  if (status === "provisioning")
    return (
      <Badge tone="warning">
        <Loader2 size={12} className="animate-[spin_0.7s_linear_infinite]" /> Building
      </Badge>
    )
  if (status === "error")
    return (
      <Badge tone="danger">
        <AlertCircle size={12} /> Error
      </Badge>
    )
  return <Badge tone="neutral">Not deployed</Badge>
}
