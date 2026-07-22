// ============================================
// QUICKARDS — Page header
// ============================================
//
// The standard page opening: a spec-sheet kicker, a display title, and an
// optional action, closed by a hairline. Matches the bespoke headers on
// Templates and Batches so every page in the app opens the same way.

import type { ReactNode } from "react";

export default function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--k-border)] pb-6">
      <div>
        {kicker ? <span className="qk-kicker">{kicker}</span> : null}
        <h1 className="qk-display mt-3 text-[clamp(1.9rem,4vw,2.6rem)]">{title}</h1>
        {subtitle ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--k-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
