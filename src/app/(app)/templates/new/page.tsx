// ============================================
// QUICKARDS — New template entry point
// ============================================
//
// Creating from this page immediately opens a real, versioned document in the
// editor rather than leaving a placeholder route between a user's intent and
// their first design action.

"use client";

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

  return <div className="mx-auto max-w-lg py-16"><h1 className="text-2xl font-semibold">Create a template</h1><p className="mt-2 text-sm text-[var(--k-text-muted)]">Start with a standard CR80 ID card and make it yours in the editor.</p><form className="mt-8 space-y-4 rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)]" onSubmit={create}><label className="block text-sm font-medium">Template name<input className="mt-2 w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></label>{error && <p className="text-sm text-[var(--k-danger)]">{error}</p>}<div className="flex justify-end gap-3"><Button href="/templates" variant="ghost">Cancel</Button><Button type="submit" loading={saving}>Open editor</Button></div></form></div>;
}
