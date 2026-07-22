// ============================================
// QUICKARDS — Card
// ============================================
//
// The standard app-surface container: a raised panel on the --k-* tokens.

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[color-mix(in_srgb,var(--k-surface)_94%,transparent)] shadow-[var(--k-shadow)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
