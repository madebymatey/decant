import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/cn"

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface", className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border px-5 py-4", className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border px-5 py-3",
        className
      )}
      {...props}
    />
  )
}

// ── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md"

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-background hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
}

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string
): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: { variant?: ButtonVariant; size?: ButtonSize } & React.ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

// ── Badge ────────────────────────────────────────────────────────────────────

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent"

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-border-strong bg-surface-hover text-muted",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  accent: "border-border-strong bg-surface-hover text-foreground",
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: BadgeTone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  )
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border-strong bg-background px-3 text-sm text-foreground placeholder:text-subtle focus:border-foreground/40 focus:outline-none",
        className
      )}
      {...props}
    />
  )
})

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border-strong bg-background px-3 text-sm text-foreground focus:border-foreground/40 focus:outline-none",
        className
      )}
      {...props}
    />
  )
})

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium text-muted", className)}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

/** Pulsing placeholder block for loading states. Size it with className. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-hover", className)}
      aria-hidden
      {...props}
    />
  )
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
