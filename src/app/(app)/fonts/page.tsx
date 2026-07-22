// ============================================
// QUICKARDS — Fonts
// ============================================

import { Type } from "lucide-react";

import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

export default async function FontsPage() {
  const scope = await requireOrgScope();
  const fonts = await scoped(scope).fonts.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Fonts" subtitle="Custom fonts available to your card designs." />

      {fonts.length === 0 ? (
        <EmptyState
          icon={<Type className="size-8" />}
          title="No custom fonts yet"
          description="Upload .ttf or .otf fonts to use them in the editor. The full font library and uploader arrive with the editor."
        />
      ) : (
        <ul className="divide-y divide-[var(--k-border)] overflow-hidden rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)]">
          {fonts.map((font) => (
            <li key={font.id} className="flex items-center justify-between px-5 py-4">
              <span className="font-medium">{font.name}</span>
              <span className="text-xs text-[var(--k-text-muted)]">
                {font.family} · {font.weight} · {font.style}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
