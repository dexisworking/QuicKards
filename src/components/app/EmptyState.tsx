// ============================================
// QUICKARDS — Empty state
// ============================================
//
// Left-aligned prose, not a centred dashed box with an icon in a tinted
// rounded square. An empty state is the best place in the product to explain
// what the thing IS, and centred text with a decorative glyph reads as a
// placeholder rather than an explanation.

import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  /** Kept in the signature for call sites that still pass one; deliberately
   *  not rendered — the copy carries the meaning. */
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="max-w-md py-8">
      <h3 className="text-base font-semibold text-[var(--k-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[var(--k-text-muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
