"use client";

import Image from "next/image";
import { FormEvent, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileUp, ImageUp, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";

export type ProjectPayload = {
  project: {
    id: string;
    name: string;
    status: string;
  };
  cardData: Array<{ id: string; card_id: string; data: Record<string, string> }>;
  assets: Array<{ id: string; card_id: string | null; file_url: string }>;
  jobs: Array<{ id: string; status: string; created_at: string; output_url: string | null; error: string | null }>;
};

type Props = {
  projectId: string;
  initialData: ProjectPayload;
};

const statusDot: Record<string, string> = {
  completed: "swiss-dot-success",
  pending: "swiss-dot-warning",
  failed: "swiss-dot-danger",
};

const statusBadge: Record<string, string> = {
  completed: "swiss-badge-success",
  pending: "swiss-badge-warning",
  failed: "swiss-badge-danger",
};

export const ProjectWorkspace = ({ projectId, initialData }: Props) => {
  const [projectData, setProjectData] = useState<ProjectPayload>(initialData);
  const [preview, setPreview] = useState<Array<{ card_id: string; image: string }>>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [singleCardId, setSingleCardId] = useState("");
  const [singleImageFile, setSingleImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragCsv, setDragCsv] = useState(false);
  const [dragZip, setDragZip] = useState(false);

  const withProgress = async <T,>(task: () => Promise<T>) => {
    setProgress(8);
    const timer = setInterval(() => {
      setProgress((value) => Math.min(92, value + 7));
    }, 180);
    try {
      const result = await task();
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
      return result;
    } finally {
      clearInterval(timer);
    }
  };

  const refreshProject = useCallback(async () => {
    const response = await fetch(`/api/v1/projects/${projectId}`);
    const payload = (await response.json()) as ProjectPayload & { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Could not load project");
      return;
    }
    setProjectData(payload);
  }, [projectId]);

  const uploadCsv = async (event: FormEvent) => {
    event.preventDefault();
    if (!csvFile) { setMessage("Select a CSV file first."); return; }
    setIsBusy(true); setMessage(null);
    const formData = new FormData(); formData.append("file", csvFile);
    const response = await withProgress(() => fetch(`/api/v1/projects/${projectId}/data`, { method: "POST", body: formData }));
    const payload = (await response.json()) as { imported?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "CSV upload failed"); return; }
    setMessage(`Imported ${payload.imported ?? 0} rows.`);
    await refreshProject();
  };

  const uploadZip = async (event: FormEvent) => {
    event.preventDefault();
    if (!zipFile) { setMessage("Select a ZIP file first."); return; }
    setIsBusy(true); setMessage(null);
    const formData = new FormData(); formData.append("file", zipFile);
    const response = await withProgress(() => fetch(`/api/v1/projects/${projectId}/images/zip`, { method: "POST", body: formData }));
    const payload = (await response.json()) as { imported?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "ZIP upload failed"); return; }
    setMessage(`Mapped ${payload.imported ?? 0} images.`);
    await refreshProject();
  };

  const uploadSingleImage = async (event: FormEvent) => {
    event.preventDefault();
    if (!singleCardId.trim() || !singleImageFile) { setMessage("Provide both card ID and image."); return; }
    setIsBusy(true); setMessage(null);
    const formData = new FormData();
    formData.append("card_id", singleCardId.trim());
    formData.append("file", singleImageFile);
    const response = await withProgress(() => fetch(`/api/v1/projects/${projectId}/images`, { method: "POST", body: formData }));
    const payload = (await response.json()) as { error?: string };
    setIsBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "Image mapping failed"); return; }
    setMessage("Image mapped.");
    await refreshProject();
  };

  const runPreview = async () => {
    setIsBusy(true); setMessage(null);
    const response = await withProgress(() => fetch(`/api/v1/projects/${projectId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 }),
    }));
    const payload = (await response.json()) as { previews?: Array<{ card_id: string; image: string }>; error?: string };
    setIsBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "Preview failed"); return; }
    setPreview(payload.previews ?? []);
  };

  const runRender = async () => {
    setIsBusy(true); setMessage(null);
    const response = await withProgress(() => fetch(`/api/v1/projects/${projectId}/render`, { method: "POST" }));
    const payload = (await response.json()) as { renderedCards?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "Render failed"); return; }
    setMessage(`Render completed for ${payload.renderedCards ?? 0} cards.`);
    await refreshProject();
  };

  const downloadJob = async (jobId: string) => {
    const jobResponse = await fetch(`/api/v1/jobs/${jobId}`);
    const jobPayload = (await jobResponse.json()) as { download?: string; error?: string };
    if (!jobResponse.ok || !jobPayload.download) { setMessage(jobPayload.error ?? "Could not fetch job download endpoint"); return; }
    window.open(jobPayload.download, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {isBusy ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          />
        ) : null}
      </AnimatePresence>
      <Toast message={message} type={message?.toLowerCase().includes("fail") || message?.toLowerCase().includes("error") ? "error" : "success"} />

      {/* Progress */}
      {progress > 0 ? (
        <div className="swiss-progress">
          <motion.div
            className="swiss-progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      ) : null}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <p className="swiss-kicker">Rows</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{projectData.cardData.length}</p>
        </Card>
        <Card>
          <p className="swiss-kicker">Images</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{projectData.assets.length}</p>
        </Card>
        <Card>
          <p className="swiss-kicker">Jobs</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{projectData.jobs.length}</p>
        </Card>
        <Card>
          <p className="swiss-kicker">Status</p>
          <span className={`mt-1 inline-flex swiss-badge ${statusBadge[projectData.project.status] ?? "swiss-badge-muted"}`}>
            {projectData.project.status}
          </span>
        </Card>
      </section>

      {/* Step 1: CSV */}
      <Card variant="accent">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">1</span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Data import</h2>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={uploadCsv}>
          <motion.label
            onDragOver={(e) => { e.preventDefault(); setDragCsv(true); }}
            onDragLeave={() => setDragCsv(false)}
            onDrop={(e) => { e.preventDefault(); setDragCsv(false); setCsvFile(e.dataTransfer.files?.[0] ?? null); }}
            animate={{ scale: dragCsv ? 1.01 : 1 }}
            className={`swiss-dropzone w-full md:min-w-[260px] ${dragCsv ? "swiss-dropzone-active" : ""}`}
          >
            <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
            <UploadCloud className="mr-2 h-4 w-4" />
            {csvFile ? csvFile.name : "Drop CSV or click to browse"}
          </motion.label>
          <Button disabled={isBusy} variant="primary" title="Upload CSV data" className="w-full sm:w-auto">
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            Upload CSV
          </Button>
        </form>
      </Card>

      {/* Step 2: Images */}
      <Card variant="accent">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">2</span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Image mapping</h2>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={uploadZip}>
          <motion.label
            onDragOver={(e) => { e.preventDefault(); setDragZip(true); }}
            onDragLeave={() => setDragZip(false)}
            onDrop={(e) => { e.preventDefault(); setDragZip(false); setZipFile(e.dataTransfer.files?.[0] ?? null); }}
            animate={{ scale: dragZip ? 1.01 : 1 }}
            className={`swiss-dropzone w-full md:min-w-[260px] ${dragZip ? "swiss-dropzone-active" : ""}`}
          >
            <input className="hidden" type="file" accept=".zip,application/zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
            <UploadCloud className="mr-2 h-4 w-4" />
            {zipFile ? zipFile.name : "Drop ZIP or click to browse"}
          </motion.label>
          <Button disabled={isBusy} title="Upload ZIP mapping" className="w-full sm:w-auto">
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
            Upload ZIP
          </Button>
        </form>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={uploadSingleImage}>
          <input value={singleCardId} onChange={(event) => setSingleCardId(event.target.value)} placeholder="card_id" className="swiss-input w-full sm:max-w-[220px]" />
          <input className="swiss-file w-full sm:max-w-sm" type="file" accept="image/*" onChange={(event) => setSingleImageFile(event.target.files?.[0] ?? null)} />
          <Button disabled={isBusy} title="Upload single card image" className="w-full sm:w-auto">
            Upload single image
          </Button>
        </form>
      </Card>

      {/* Step 3: Render */}
      <Card variant="accent">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">3</span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Render output</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isBusy} onClick={runPreview} title="Render preview cards" className="w-full sm:w-auto">
            Render preview (5 cards)
          </Button>
          <Button disabled={isBusy} onClick={runRender} variant="primary" title="Run full card generation" className="w-full sm:w-auto">
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Full batch render
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {preview.length > 0 ? (
        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Preview</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {preview.map((item) => (
              <motion.div key={item.card_id} whileHover={{ y: -4, boxShadow: "var(--shadow-md)" }} className="overflow-hidden rounded-xl border border-[var(--line)] p-2 transition-shadow">
                <p className="mb-2 text-xs font-mono text-[var(--muted)]">{item.card_id}</p>
                <Image unoptimized src={item.image} width={480} height={300} alt={item.card_id} className="h-auto w-full rounded-lg" />
              </motion.div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Jobs */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">Jobs</h2>
        <div className="mt-3 space-y-2">
          {projectData.jobs.length ? (
            projectData.jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-2 rounded-xl border border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5 text-sm">
                  <span className={`swiss-dot mt-1.5 ${statusDot[job.status] ?? "swiss-dot-warning"}`} />
                  <div>
                    <p className="font-mono text-xs text-[var(--foreground)]">{job.id}</p>
                    <span className={`swiss-badge mt-1 ${statusBadge[job.status] ?? "swiss-badge-muted"}`}>
                      {job.status}
                    </span>
                    {job.error ? <p className="mt-1 text-xs text-[var(--danger)]">{job.error}</p> : null}
                  </div>
                </div>
                {job.status === "completed" ? (
                  <Button onClick={() => downloadJob(job.id)} title="Download rendered zip" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Download ZIP
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">No jobs yet.</p>
          )}
        </div>
      </Card>

      {/* Data snapshot */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">Loaded data snapshot</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cards: {projectData.cardData.length} · Images: {projectData.assets.length} · Status: {projectData.project.status}
        </p>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--line)]">
          <table className="swiss-table">
            <thead>
              <tr>
                <th>card_id</th>
                <th>data</th>
              </tr>
            </thead>
            <tbody>
              {projectData.cardData.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-[var(--foreground)]">{row.card_id}</td>
                  <td className="text-[var(--muted)]">{JSON.stringify(row.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
