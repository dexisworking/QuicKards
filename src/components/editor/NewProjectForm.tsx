// ============================================
// QUICKARDS — New project client form
// ============================================
//
// Kept client-side only for the form submission; available templates arrive
// from the server route so the browser never asks for an unscoped list.

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";

export default function NewProjectForm({ templates }: { templates: Array<{ id: string; name: string }> }) {
  const router = useRouter(); const [name, setName] = useState("Untitled batch"); const [templateId, setTemplateId] = useState(templates[0]?.id ?? ""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function create(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, templateId: templateId || undefined }) }); const data = await response.json().catch(() => null) as { id?: string; error?: string } | null; if (!response.ok || !data?.id) { setError(data?.error ?? "Could not create the project"); setSaving(false); return; } router.replace(`/projects/${data.id}`); }
  return <div className="mx-auto max-w-lg py-16"><h1 className="text-2xl font-semibold">Create a project</h1><p className="mt-2 text-sm text-[var(--k-text-muted)]">A project holds one data batch, its matched photos, and its rendered output.</p><form className="mt-8 space-y-4 rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)]" onSubmit={create}><label className="block text-sm font-medium">Project name<input className="mt-2 w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="block text-sm font-medium">Template<select className="mt-2 w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)} required><option value="" disabled>Select a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>{templates.length === 0 && <p className="text-sm text-[var(--k-danger)]">Create a template first.</p>}{error && <p className="text-sm text-[var(--k-danger)]">{error}</p>}<div className="flex justify-end gap-3"><Button href="/projects" variant="ghost">Cancel</Button><Button type="submit" loading={saving} disabled={!templateId}>Create project</Button></div></form></div>;
}
