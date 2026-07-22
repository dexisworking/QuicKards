// ============================================
// QUICKARDS — Public template gallery
// ============================================
//
// Published starters are indexable marketing pages, while the fork action
// creates a private, organization-scoped version through the authenticated API.

import Link from "next/link";
import type { Metadata } from "next";

import { gallery } from "@/lib/db/gallery";

export const metadata: Metadata = {
  title: "ID card templates",
  description:
    "Browse ready-to-fork student ID, event pass, and visitor badge templates for bulk card generation.",
};

export default async function GalleryPage() {
  const templates = await gallery.list();
  return <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-red-accent">Starter gallery</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Start with a design that fits.</h1><p className="mt-3 max-w-2xl text-text-secondary">Fork a starter, adapt it in the editor, then generate your full batch from one shared design.</p><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{templates.map((template) => <Link key={template.id} href={`/gallery/${template.slug}`} className="group rounded-[var(--radius-lg)] border border-rule bg-surface p-5 transition hover:-translate-y-1 hover:border-red/35"><div className="aspect-[1.586/1] rounded-lg bg-gradient-to-br from-red/30 via-bg-elevated to-surface" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-accent">{template.category}</p><h2 className="mt-1 font-semibold group-hover:text-red-accent">{template.name}</h2><p className="mt-2 text-sm text-text-muted">Open template →</p></Link>)}</div>{templates.length === 0 && <p className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-rule-light p-8 text-text-secondary">Starter templates will appear here soon.</p>}</main>;
}
