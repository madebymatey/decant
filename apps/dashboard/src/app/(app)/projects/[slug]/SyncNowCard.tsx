"use client"

import { useFormState } from "react-dom"
import { RefreshCw } from "lucide-react"
import type { Project } from "@/db/schema"
import { syncNowAction, type ActionState } from "../actions"
import { relativeTime, formatDateTime } from "@/lib/format"
import { Card } from "@/components/ui"
import { SubmitButton } from "@/components/SubmitButton"
import { useActionToast } from "@/components/Toast"

export function SyncNowCard({ project }: { project: Project }) {
  const [state, formAction] = useFormState(syncNowAction, {} as ActionState)
  useActionToast(state)

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Manual sync</p>
        <p className="mt-0.5 text-xs text-muted">
          Last synced {relativeTime(project.lastSyncAt)}
          {project.lastSyncAt ? ` · ${formatDateTime(project.lastSyncAt)}` : ""}
        </p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="projectId" value={project.id} />
        <SubmitButton variant="primary" pendingLabel="Syncing…">
          <RefreshCw size={15} />
          Sync now
        </SubmitButton>
      </form>
    </Card>
  )
}
