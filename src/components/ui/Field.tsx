// ============================================
// QUICKARDS — Field (label + control + error)
// ============================================
//
// A labelled form row. Keeps the label/input/error markup consistent across
// the auth forms and settings pages so they read as one system.

import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--k-text)]">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-[var(--k-danger)]">{error}</p> : null}
    </div>
  );
}
