// ============================================
// QUICKARDS — Starter template detail
// ============================================
//
// One public page per starter gives the gallery useful search surface while
// keeping the actual document data server-side until a user forks it.

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import GalleryForkButton from "@/components/gallery/GalleryForkButton";
import { gallery } from "@/lib/db/gallery";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = await gallery.bySlug(slug);
  if (!template) return { title: "Template not found" };
  return {
    title: `${template.name} template`,
    description: `Fork the ${template.name} starter and customize it for your organization.`,
  };
}

export default async function GalleryTemplatePage({ params }: Props) {
  const { slug } = await params; const template = await gallery.bySlug(slug); if (!template) notFound();
  return <main className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr]"><div className="aspect-[1.586/1] rounded-[var(--radius-lg)] border border-rule bg-gradient-to-br from-red/35 via-bg-elevated to-surface shadow-2xl" /><div><p className="text-xs font-bold uppercase tracking-[.16em] text-red-accent">{template.category}</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{template.name}</h1><p className="mt-4 text-text-secondary">A ready-to-customize card template. Fork it into your workspace, edit the design, and render your first batch.</p><GalleryForkButton slug={template.slug} /></div></main>;
}
