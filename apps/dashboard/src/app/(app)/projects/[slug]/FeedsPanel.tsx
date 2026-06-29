"use client"

import { useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { FEED_KINDS, FEED_META, type FeedKind } from "@/lib/feed-kinds"
import type { Project } from "@/db/schema"
import { Card } from "@/components/ui"
import { cn } from "@/lib/cn"

export function FeedsPanel({
  project,
  deployUrl,
  hasFeedKey,
}: {
  project: Project
  deployUrl: string
  hasFeedKey: boolean
}) {
  const [active, setActive] = useState<FeedKind>("products")
  const [view, setView] = useState<"raw" | "list">("list")
  const [data, setData] = useState<unknown[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load(kind: FeedKind) {
    setActive(kind)
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/feed/${kind}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load feed")
      setData(Array.isArray(json) ? json : [json])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1200)
  }

  const base = deployUrl.replace(/\/+$/, "")
  const publicUrl = (kind: FeedKind) => `${base}/api/feed/${kind}`

  if (!deployUrl) {
    return (
      <Card className="p-6">
        <h2 className="text-sm font-medium">Feeds live on the project deployment</h2>
        <p className="mt-1.5 text-sm text-muted">
          This project has no deployment URL yet. Add it under{" "}
          <span className="text-foreground">Settings → Deployment</span>, then the feed URLs and
          previews will point at <span className="font-mono">{"<deploy>"}/api/feed/…</span>.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium">Feed endpoints</h2>
          <p className="mt-0.5 text-xs text-muted">
            Read-only URLs Framer&apos;s CMS sync can pull from.
            {hasFeedKey ? " Protected — append ?key=<feedKey>." : " Currently open (no feed key set)."}
          </p>
        </div>
        <ul className="divide-y divide-border">
          {FEED_KINDS.map((kind) => (
            <li key={kind} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{FEED_META[kind].label}</p>
                <p className="truncate font-mono text-xs text-subtle">{publicUrl(kind)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => copy(publicUrl(kind), kind)}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-border-strong px-2 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  {copied === kind ? <Check size={13} /> : <Copy size={13} />}
                  {copied === kind ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => load(kind)}
                  className={cn(
                    "h-7 rounded-md border px-3 text-xs",
                    active === kind && data
                      ? "border-foreground bg-surface-hover text-foreground"
                      : "border-border-strong text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  Preview
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">{FEED_META[active].label} preview</h2>
            {data ? (
              <span className="rounded-full border border-border-strong bg-surface-hover px-2 py-0.5 text-xs text-muted">
                {data.length} records
              </span>
            ) : null}
          </div>
          <div className="inline-flex rounded-md border border-border-strong p-0.5">
            {(["list", "raw"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs capitalize",
                  view === v ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground"
                )}
              >
                {v === "raw" ? "Raw JSON" : "Clean list"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted">
              <Loader2 size={15} className="animate-[spin_0.7s_linear_infinite]" />
              Fetching feed…
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-subtle">
              Choose a feed above and hit Preview.
            </p>
          ) : view === "raw" ? (
            <pre className="max-h-[480px] overflow-auto rounded-md bg-background p-4 font-mono text-xs leading-relaxed text-muted">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <FeedTable rows={data as Record<string, unknown>[]} />
          )}
        </div>
      </Card>
    </div>
  )
}

function FeedTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <p className="py-6 text-sm text-subtle">No records.</p>
  const columns = Object.keys(rows[0]).slice(0, 6)
  return (
    <div className="max-h-[480px] overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {columns.map((c) => (
                <td key={c} className="max-w-[220px] truncate px-3 py-2 text-foreground/90">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}
