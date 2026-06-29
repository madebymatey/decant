"use client"

import { useFormState } from "react-dom"
import { updateScheduleAction, type ActionState } from "../actions"
import type { Project } from "@/db/schema"
import { Card, CardBody, CardHeader, Field } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"

// The central scheduler runs once a day (see vercel.json cron), so daily is the
// finest cadence that can actually be honoured. Add sub-daily options back here
// only if the cron in vercel.json is made more frequent (needs Vercel Pro).
const INTERVALS = [
  { value: 1440, label: "Daily" },
  { value: 2880, label: "Every 2 days" },
  { value: 4320, label: "Every 3 days" },
  { value: 10080, label: "Weekly" },
  { value: 20160, label: "Every 2 weeks" },
]

export function SchedulePanel({ project }: { project: Project }) {
  const [state, formAction] = useFormState(updateScheduleAction, {} as ActionState)

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Scheduled sync</h2>
        <p className="mt-0.5 text-xs text-muted">
          A central scheduler runs once a day (06:00 UTC) and syncs whichever projects are due, so
          daily is the finest cadence. Use “Sync now” for anything more immediate.
        </p>
      </CardHeader>
      <form action={formAction}>
        <CardBody className="space-y-4">
          {state.ok ? (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
              Schedule saved.
            </div>
          ) : null}
          {state.error ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {state.error}
            </div>
          ) : null}

          <input type="hidden" name="projectId" value={project.id} />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="scheduleEnabled"
              defaultChecked={project.scheduleEnabled}
              className="h-4 w-4 accent-foreground"
            />
            <span className="text-sm">Enable scheduled sync</span>
          </label>

          <Field label="Interval">
            <select
              name="scheduleIntervalMinutes"
              defaultValue={String(project.scheduleIntervalMinutes)}
              className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-sm"
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <SubmitButton variant="primary" pendingLabel="Saving…">
            Save schedule
          </SubmitButton>
        </div>
      </form>
    </Card>
  )
}
