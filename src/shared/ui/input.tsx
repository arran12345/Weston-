import * as React from "react";

import { cn } from "@/shared/lib/cn";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full border border-border bg-background px-3 text-sm text-foreground",
        "placeholder:text-foreground/40",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        "disabled:opacity-40",
        type === "number" && "font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full border border-border bg-background px-3 text-sm text-foreground",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-xs font-medium uppercase tracking-widest text-foreground/60",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Wraps the control in its <label> so the two are implicitly associated —
 * no id plumbing needed at each call site, and screen readers announce the
 * field name correctly.
 */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-negative">{error}</span>
      ) : null}
    </label>
  );
}
