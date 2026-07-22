// ============================================
// QUICKARDS — Gallery fork action
// ============================================
//
// Kept client-side solely for the authenticated mutation; the public gallery
// page still renders entirely on the server for crawlability and fast loading.

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GalleryForkButton({ slug }: { slug: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function fork() { setBusy(true); setError(""); const response = await fetch(`/api/gallery/${slug}/fork`, { method: "POST" }); const data = await response.json().catch(() => null) as { templateId?: string; error?: string } | null; if (!response.ok || !data?.templateId) { setError(data?.error ?? "Could not fork this template"); setBusy(false); return; } router.push(`/templates/${data.templateId}`); }
  return <div className="mt-8"><button type="button" onClick={fork} disabled={busy} className="rounded-[var(--radius-md)] bg-red px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Creating your copy…" : "Use this template"}</button>{error && <p className="mt-3 text-sm text-red-accent">{error}</p>}</div>;
}
