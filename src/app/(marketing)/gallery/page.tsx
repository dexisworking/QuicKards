// ============================================
// QUICKARDS — Public template gallery
// ============================================
//
// Published starters are indexable marketing pages; forking creates a private,
// organization-scoped copy through the authenticated API.
//
// Rendered per request rather than prerendered: this page reads from the
// database, and a build should never depend on the database being reachable
// (it previously failed a production build for exactly that reason). Server
// rendering keeps it fully indexable.

import type { Metadata } from "next";
import Link from "next/link";

import { gallery } from "@/lib/db/gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ID card templates",
  description:
    "Browse ready-to-fork student ID, event pass, and visitor badge templates for bulk card generation.",
};

export default async function GalleryPage() {
  const templates = await gallery.list();

  return (
    <main>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-red" aria-hidden />
            <span className="qk-label text-text-muted">Starter gallery</span>
          </div>
          <h1 className="qk-display mt-7 max-w-3xl text-[clamp(2.25rem,5.5vw,3.5rem)]">
            Start from a card that already works.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
            Fork a starter, adapt it in the editor, then run your whole batch
            from that one design.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {templates.length === 0 ? (
          <p className="max-w-md leading-7 text-text-muted">
            Starter templates are on their way. In the meantime you can design a
            card from a blank CR80 canvas in the editor.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <li key={template.id}>
                <Link href={`/gallery/${template.slug}`} className="group block">
                  {/* Card-ratio proof surface, quiet by default so a row of
                      them reads as a contact sheet. */}
                  <div
                    className="mb-4 w-full rounded-[6px] border border-rule bg-surface transition-colors group-hover:border-rule-light"
                    style={{ aspectRatio: 85.6 / 54 }}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-semibold transition-colors group-hover:text-red-accent">
                      {template.name}
                    </h2>
                    <span className="qk-label text-text-faint">{template.category}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
