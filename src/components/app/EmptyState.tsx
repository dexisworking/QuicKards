// ============================================
// QUICKARDS — Empty state
// ============================================

import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-[calc(var(--k-radius)+4px)] border border-dashed border-[var(--k-border)] px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-[var(--k-text-faint)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--k-text)]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--k-text-muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
