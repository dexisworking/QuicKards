// ============================================
// QUICKARDS — Batch project workspace
// ============================================
//
// This UI intentionally delegates bytes to the existing API boundary: CSV and
// ZIP uploads reuse Phase 4 ingestion, then rendering is queued through
// Inngest rather than held open in the browser request.

"use client";

import { Download, FileSpreadsheet, ImageUp, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";

type Project = { id: string; name: string; status: string };
type Job = { id: string; status: string; progress: number; total: number; hasOutput: boolean; error?: string | null };

export default function ProjectWorkspace({ project }: { project: Project }) {
  const [status, setStatus] = useState(project.status); const [message, setMessage] = useState(""); const [busy, setBusy] = useState<"csv" | "zip" | "render" | null>(null); const [job, setJob] = useState<Job | null>(null);
  useEffect(() => { if (!job || !["queued", "running"].includes(job.status)) return; const timer = window.setInterval(async () => { const response = await fetch(`/api/jobs/${job.id}`); if (response.ok) { const next = await response.json() as Job; setJob(next); if (next.status === "completed") setStatus("rendered"); } }, 1500); return () => window.clearInterval(timer); }, [job]);
  async function upload(kind: "csv" | "zip", file: File | null) { if (!file) return; setBusy(kind); setMessage(""); const form = new FormData(); form.set("file", file); const endpoint = kind === "csv" ? "data" : "assets/zip"; const response = await fetch(`/api/projects/${project.id}/${endpoint}`, { method: "POST", body: form }); const data = await response.json().catch(() => null) as { error?: string; imported?: number; skipped?: number } | null; setBusy(null); if (!response.ok) { setMessage(data?.error ?? "Upload failed"); return; } setStatus(kind === "csv" ? "data_uploaded" : "images_uploaded"); setMessage(`${kind === "csv" ? "Rows" : "Photos"} imported: ${data?.imported ?? 0}${data?.skipped ? `; skipped: ${data.skipped}` : ""}`); }
  async function render() { setBusy("render"); setMessage(""); const response = await fetch(`/api/projects/${project.id}/render`, { method: "POST" }); const data = await response.json().catch(() => null) as { error?: string; jobId?: string; total?: number } | null; setBusy(null); if (!response.ok || !data?.jobId) { setMessage(data?.error ?? "Could not enqueue render"); return; } setStatus("rendering"); setJob({ id: data.jobId, status: "queued", progress: 0, total: data.total ?? 0, hasOutput: false }); }
  return <div className="mx-auto max-w-3xl space-y-6"><div><Link href="/projects" className="text-sm text-[var(--k-text-muted)] hover:text-[var(--k-text)]">Projects</Link><h1 className="mt-2 text-2xl font-semibold">{project.name}</h1><p className="mt-1 text-sm text-[var(--k-text-muted)]">Status: {status.replaceAll("_", " ")}</p></div><div className="grid gap-4 md:grid-cols-2"><UploadCard icon={<FileSpreadsheet className="size-5" />} title="1. Upload CSV" accept=".csv,text/csv" busy={busy === "csv"} onFile={(file) => upload("csv", file)} /><UploadCard icon={<ImageUp className="size-5" />} title="2. Upload photo ZIP" accept=".zip,application/zip" busy={busy === "zip"} onFile={(file) => upload("zip", file)} /></div><div className="rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-medium">3. Render batch</h2><p className="mt-1 text-sm text-[var(--k-text-muted)]">The queue creates your print-ready PDF and ZIP in the background.</p></div><Button onClick={render} loading={busy === "render"} icon={<Play className="size-4" />}>Render</Button></div>{job && <div className="mt-4 rounded-[var(--k-radius)] bg-[var(--k-surface-2)] p-3 text-sm"><div className="flex justify-between"><span>{job.status}</span><span>{job.progress}/{job.total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--k-border)]"><div className="h-full bg-[var(--k-accent)]" style={{ width: `${job.total ? job.progress / job.total * 100 : 0}%` }} /></div>{job.hasOutput && <Button href={`/api/jobs/${job.id}/download`} className="mt-3" size="sm" icon={<Download className="size-3" />}>Download output</Button>}</div>}{message && <p className="mt-4 text-sm text-[var(--k-text-muted)]">{message}</p>}</div></div>;
}

function UploadCard({ icon, title, accept, busy, onFile }: { icon: React.ReactNode; title: string; accept: string; busy: boolean; onFile: (file: File | null) => void }) { return <label className="cursor-pointer rounded-[calc(var(--k-radius)+4px)] border border-dashed border-[var(--k-border-strong)] bg-[var(--k-surface)] p-5 transition-colors hover:border-[var(--k-accent-border)]"><div className="flex items-center gap-2 font-medium">{icon}{title}</div><p className="mt-2 text-sm text-[var(--k-text-muted)]">Choose a file to import directly into this project.</p><input className="sr-only" type="file" accept={accept} disabled={busy} onChange={(event) => onFile(event.target.files?.[0] ?? null)} /><span className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--k-accent)]">{busy ? <RefreshCw className="size-4 animate-spin" /> : "Choose file"}</span></label>; }
