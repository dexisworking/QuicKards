// ============================================
// QUICKARDS — "arriving with the editor" placeholder
// ============================================
//
// Honest placeholder for routes whose UI depends on the editor (Phase 7). The
// backend for these flows already exists and is tested; this is the UI that
// hangs off it.

import { ArrowLeft, Hammer } from "lucide-react";

import Button from "@/components/ui/Button";

export default function ComingInEditor({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto grid max-w-lg place-items-center rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] px-6 py-16 text-center shadow-[var(--k-shadow)]">
      <div className="mb-4 grid size-12 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]">
        <Hammer className="size-6" />
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--k-text-muted)]">{description}</p>
      <div className="mt-6">
        <Button href={backHref} variant="secondary" icon={<ArrowLeft className="size-4" />}>
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
