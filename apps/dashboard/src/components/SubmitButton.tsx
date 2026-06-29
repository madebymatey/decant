"use client"

import { useFormStatus } from "react-dom"
import { Button, type ButtonProps } from "@/components/ui"

/** Submit button that reflects the enclosing form's pending state. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && (
        <span
          className="inline-block h-3.5 w-3.5 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {pending ? pendingLabel ?? "Working…" : children}
    </Button>
  )
}
