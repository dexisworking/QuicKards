// ============================================
// QUICKARDS — New template entry point
// ============================================
//
// Creating from this page immediately opens a real, versioned document in the
// editor rather than leaving a placeholder route between a user's intent and
// their first design action.

"use client";

import { ArrowRight, LayoutTemplate, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("Untitled ID card");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => null) as { templateId?: string; error?: string } | null;
    if (!response.ok || !data?.templateId) { setError(data?.error ?? "Could not create the template"); setSaving(false); return; }
    router.replace(`/templates/${data.templateId}`);
  }

  return <div className="mx-auto max-w-3xl py-8 sm:py-14"><div className="grid gap-8 lg:grid-cols-[1fr_.72fr]"><div><p className="qk-kicker">Your design system</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Create a template</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[var(--k-text-muted)]">Start with a standard CR80 card, then add the text, photos, shapes, and codes your batch needs.</p><div className="mt-8 rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[linear-gradient(135deg,var(--k-accent-soft),var(--k-surface)_65%)] p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent)] text-white"><Sparkles className="size-4" /></span><div><p className="text-sm font-semibold">Versioned from the first edit</p><p className="mt-0.5 text-xs leading-5 text-[var(--k-text-muted)]">Your document saves automatically while you work.</p></div></div></div></div><form className="space-y-5 rounded-[calc(var(--k-radius)+7px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)] sm:p-7" onSubmit={create}><span className="grid size-10 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]"><LayoutTemplate className="size-5" /></span><div><label htmlFor="template-name" className="text-sm font-semibold">Template name</label><p className="mt-1 text-xs text-[var(--k-text-muted)]">For example, “2026 student ID” or “Volunteer badge”.</p><input id="template-name" className="mt-3 h-11 w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 text-sm outline-none transition focus:border-[var(--k-accent-border)] focus:ring-2 focus:ring-[var(--k-accent-soft)]" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></div>{error && <p className="rounded-[var(--k-radius)] bg-[color-mix(in_srgb,var(--k-danger)_10%,transparent)] p-3 text-sm text-[var(--k-danger)]">{error}</p>}<div className="flex justify-end gap-3 border-t border-[var(--k-border)] pt-5"><Button href="/templates" variant="ghost">Cancel</Button><Button type="submit" loading={saving} icon={<ArrowRight className="size-4" />}>Open editor</Button></div></form></div></div>;
}
