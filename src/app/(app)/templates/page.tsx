// ============================================
// QUICKARDS — Templates
// ============================================
//
// A contact sheet of card faces. Each thumbnail keeps the true CR80 ratio, so
// the page reads like proofs on a light table rather than a grid of app cards.

import { Plus } from "lucide-react";
import Link from "next/link";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

export default async function TemplatesPage() {
  const scope = await requireOrgScope();
  const templates = await scoped(scope).templates.list();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--k-border)] pb-6">
        <div>
          <span className="qk-kicker">Library</span>
          <h1 className="qk-display mt-3 text-[clamp(1.9rem,4vw,2.6rem)]">Templates</h1>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 rounded-[var(--k-radius)] bg-[var(--k-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--k-accent-hover)]"
        >
          <Plus className="size-4" />
          New template
        </Link>
      </header>

      {templates.length === 0 ? (
        <div className="max-w-md py-8">
          <p className="text-sm leading-7 text-[var(--k-text-muted)]">
            Nothing here yet. A template is the card itself — draw it once, bind
            the fields to your spreadsheet columns, then reuse it for every batch
            you ever run.
          </p>
          <Link
            href="/templates/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--k-accent)] underline-offset-4 hover:underline"
          >
            <Plus className="size-4" />
            Design your first card
          </Link>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link href={`/templates/${template.id}`} className="group block">
                {/* Proof surface at the true card ratio. Deliberately blank —
                    a fake mock-up of content the template may not have is a
                    lie; the real thumbnail lands with render previews. */}
                <div
                  className="mb-3 w-full rounded-[6px] border border-[var(--k-border)] bg-[var(--k-surface)] transition-colors group-hover:border-[var(--k-border-strong)]"
                  style={{ aspectRatio: 85.6 / 54 }}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium transition-colors group-hover:text-[var(--k-accent)]">
                    {template.name}
                  </span>
                  <span className="qk-num shrink-0 text-xs text-[var(--k-text-faint)]">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
