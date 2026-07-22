// ============================================
// QUICKARDS — Page header
// ============================================

import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--k-text-muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
