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
    <div className="grid place-items-center rounded-[calc(var(--k-radius)+6px)] border border-dashed border-[var(--k-border-strong)] bg-[color-mix(in_srgb,var(--k-surface)_70%,transparent)] px-6 py-16 text-center shadow-[var(--k-shadow)]">
      {icon ? <div className="mb-5 grid size-14 place-items-center rounded-[calc(var(--k-radius)+2px)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[var(--k-text)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--k-text-muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
