"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { SyncRun, SyncCounts } from "@/db/schema"
import { Card } from "@/components/ui"
import { cn } from "@/lib/cn"

// ── Series config ─────────────────────────────────────────────────────────────

type Metric = keyof SyncCounts // added | updated | deleted | failed | skipped

const SERIES: { key: Metric; label: string; color: string }[] = [
  { key: "added", label: "Added", color: "#3ecf8e" },
  { key: "updated", label: "Updated", color: "#5b9cff" },
  { key: "deleted", label: "Deleted", color: "#f5a623" },
  { key: "failed", label: "Failed", color: "#ff5c5c" },
  { key: "skipped", label: "Skipped", color: "#8a8a8a" },
]

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
]

// ── Geometry (SVG user units; scales to container width) ──────────────────────

const W = 900
const H = 280
const PAD = { top: 16, right: 16, bottom: 36, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const BAR_W = 10
const BAR_GAP = 4

type DayBucket = { date: Date; counts: SyncCounts }

export function SyncActivityChart({ activity }: { activity: SyncRun[] }) {
  const [days, setDays] = useState(7)
  const [open, setOpen] = useState(false)

  const buckets = useMemo(() => bucketByDay(activity, days), [activity, days])
  const yMax = useMemo(() => {
    const max = Math.max(0, ...buckets.flatMap((b) => SERIES.map((s) => b.counts[s.key])))
    return niceMax(max)
  }, [buckets])

  const ticks = useMemo(
    () => Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i)),
    [yMax]
  )
  const total = buckets.reduce(
    (n, b) => n + SERIES.reduce((m, s) => m + b.counts[s.key], 0),
    0
  )

  const colWidth = PLOT_W / buckets.length
  const yFor = (v: number) => PAD.top + PLOT_H - (yMax === 0 ? 0 : (v / yMax) * PLOT_H)
  const labelStep = Math.ceil(buckets.length / 8)

  return (
    <Card className="p-5">
      <div className="mb-2">
        <RangeMenu
          label={RANGES.find((r) => r.days === days)!.label}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          onClose={() => setOpen(false)}
          onPick={(d) => {
            setDays(d)
            setOpen(false)
          }}
        />
      </div>

      {total === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-subtle">
          No sync activity in this range.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sync activity">
          {/* gridlines + y labels */}
          {ticks.map((t) => {
            const y = yFor(t)
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="var(--subtle)"
                >
                  {t}
                </text>
              </g>
            )
          })}

          {/* bars + x labels */}
          {buckets.map((b, i) => {
            const cx = PAD.left + colWidth * (i + 0.5)
            const present = SERIES.filter((s) => b.counts[s.key] > 0)
            const groupW = present.length * BAR_W + Math.max(0, present.length - 1) * BAR_GAP
            let bx = cx - groupW / 2
            const baseY = PAD.top + PLOT_H
            return (
              <g key={i}>
                {present.map((s) => {
                  const v = b.counts[s.key]
                  const top = yFor(v)
                  // keep tiny non-zero bars visible as a pill cap
                  const h = Math.max(baseY - top, BAR_W)
                  const x = bx
                  bx += BAR_W + BAR_GAP
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={baseY - h}
                      width={BAR_W}
                      height={h}
                      rx={BAR_W / 2}
                      fill={s.color}
                    >
                      <title>{`${s.label}: ${v.toLocaleString()}`}</title>
                    </rect>
                  )
                })}
                {i % labelStep === 0 ? (
                  <text
                    x={cx}
                    y={baseY + 22}
                    textAnchor="middle"
                    fontSize={12}
                    fill="var(--muted)"
                  >
                    {dayLabel(b.date, days)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      )}

      <Legend />
    </Card>
  )
}

// ── Range dropdown ────────────────────────────────────────────────────────────

function RangeMenu({
  label,
  open,
  onToggle,
  onClose,
  onPick,
}: {
  label: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  onPick: (days: number) => void
}) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
      >
        {label}
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute left-0 z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => onPick(r.days)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover",
                  label === r.label ? "text-foreground" : "text-muted"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ── Data shaping ──────────────────────────────────────────────────────────────

const EMPTY: SyncCounts = { added: 0, updated: 0, deleted: 0, failed: 0, skipped: 0 }

/** One bucket per calendar day for the last `days` days (oldest → newest). */
function bucketByDay(runs: SyncRun[], days: number): DayBucket[] {
  const buckets: DayBucket[] = []
  const index = new Map<string, SyncCounts>()
  const today = startOfDay(new Date())

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const counts = { ...EMPTY }
    index.set(dayKey(date), counts)
    buckets.push({ date, counts })
  }

  for (const run of runs) {
    const counts = run.counts
    if (!counts) continue
    const key = dayKey(startOfDay(new Date(run.startedAt)))
    const bucket = index.get(key)
    if (!bucket) continue
    for (const s of SERIES) bucket[s.key] += counts[s.key] ?? 0
  }

  return buckets
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(d: Date, range: number): string {
  if (range <= 7) return d.toLocaleDateString(undefined, { weekday: "short" })
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Round a max value up to a clean axis ceiling (e.g. 437 → 600). */
function niceMax(max: number): number {
  if (max <= 0) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const norm = max / pow // 1..10
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const ceil = step * pow
  // Aim for ~4 even divisions; bump so the top tick sits above the data.
  return Math.ceil(max / (ceil / 4)) * (ceil / 4)
}
