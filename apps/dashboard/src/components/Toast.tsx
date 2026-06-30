"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "@/lib/cn"

type Tone = "success" | "error" | "info"

type ToastInput = { title: string; description?: string; tone?: Tone }
type Toast = ToastInput & { id: number; tone: Tone }

type ToastContextValue = {
  show: (t: ToastInput) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

/** Fire transient confirmations from any client component under <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}

const DURATION_MS = 4500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const idRef = React.useRef(0)

  const dismiss = React.useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = React.useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current
      setToasts((list) => [...list, { id, tone: input.tone ?? "info", ...input }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss]
  )

  const value = React.useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error" }),
      info: (title, description) => show({ title, description, tone: "info" }),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/**
 * Bridges a `useFormState` result into toasts. Each server-action call returns a
 * fresh state object, so a change in identity means a new submit landed — fire a
 * success toast (with an optional dynamic message from `state.message`) on `ok`,
 * and an error toast on `error`.
 */
export function useActionToast(
  state: { ok?: boolean; error?: string; message?: string },
  options: { success?: string; error?: boolean } = {}
) {
  const toast = useToast()
  const seen = React.useRef(state)
  React.useEffect(() => {
    if (state === seen.current) return
    seen.current = state
    if (state.ok && (state.message || options.success)) {
      toast.success(state.message ?? options.success!)
    } else if (state.error && options.error !== false) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

const toneStyles: Record<Tone, { border: string; icon: React.ReactNode }> = {
  success: {
    border: "border-success/40",
    icon: <CheckCircle2 size={16} className="shrink-0 text-success" />,
  },
  error: {
    border: "border-danger/40",
    icon: <AlertCircle size={16} className="shrink-0 text-danger" />,
  },
  info: {
    border: "border-border-strong",
    icon: <Info size={16} className="shrink-0 text-muted" />,
  },
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { border, icon } = toneStyles[toast.tone]
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 shadow-xl",
        "animate-[toast-in_0.18s_ease-out]",
        border
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-muted">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-subtle hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  )
}
