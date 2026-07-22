// ============================================
// QUICKARDS — Input
// ============================================
//
// App-surface text input on the --k-* tokens. The explicit `text-[var(--k-text)]`
// is not redundant with the globals input fix — it keeps the value legible even
// if this input is ever rendered outside a [data-app-theme] wrapper.

import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export default function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-surface)] px-3 text-sm text-[var(--k-text)] outline-none transition-colors",
        "focus:border-[var(--k-accent-border)] focus:ring-2 focus:ring-[var(--k-accent-soft)]",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
