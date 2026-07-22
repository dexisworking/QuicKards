// ============================================
// QUICKARDS — Fonts
// ============================================

import { Type } from "lucide-react";

import EmptyState from "@/components/app/EmptyState";
import FontUploadPanel from "@/components/app/FontUploadPanel";
import PageHeader from "@/components/app/PageHeader";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

const CURATED_LIBRARY = [
  { family: "Inter", note: "Balanced UI + body text" },
  { family: "Poppins", note: "Modern geometric headings" },
  { family: "Montserrat", note: "Strong title treatment" },
  { family: "Roboto", note: "Neutral all-purpose sans" },
  { family: "Open Sans", note: "High readability at small sizes" },
  { family: "Lato", note: "Friendly, compact labels" },
];

export default async function FontsPage() {
  const scope = await requireOrgScope();
  const fonts = await scoped(scope).fonts.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Fonts" subtitle="Custom fonts available to your card designs." />
      <FontUploadPanel />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--k-text-muted)]">Curated library</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CURATED_LIBRARY.map((font) => (
            <li key={font.family} className="rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-surface)] px-4 py-3 shadow-[var(--k-shadow)]">
              <p className="font-medium" style={{ fontFamily: font.family }}>
                {font.family}
              </p>
              <p className="mt-1 text-xs text-[var(--k-text-muted)]">{font.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {fonts.length === 0 ? (
        <EmptyState
          icon={<Type className="size-8" />}
          title="No custom fonts yet"
          description="Upload .ttf or .otf fonts to make them available in template rendering."
        />
      ) : (
        <ul className="divide-y divide-[var(--k-border)] overflow-hidden rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] shadow-[var(--k-shadow)]">
          {fonts.map((font) => (
            <li key={font.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <span className="font-medium" style={{ fontFamily: font.family }}>{font.name}</span>
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
