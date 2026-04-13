"use client";

import Image from "next/image";
import { FormEvent, useCallback, useState } from "react";

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

export const ProjectWorkspace = ({ projectId, initialData }: Props) => {
  const [projectData, setProjectData] = useState<ProjectPayload>(initialData);
  const [preview, setPreview] = useState<Array<{ card_id: string; image: string }>>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [singleCardId, setSingleCardId] = useState("");
  const [singleImageFile, setSingleImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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
    if (!csvFile) {
      setMessage("Select a CSV file first.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", csvFile);
    const response = await fetch(`/api/v1/projects/${projectId}/data`, { method: "POST", body: formData });
    const payload = (await response.json()) as { imported?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "CSV upload failed");
      return;
    }

    setMessage(`Imported ${payload.imported ?? 0} rows.`);
    await refreshProject();
  };

  const uploadZip = async (event: FormEvent) => {
    event.preventDefault();
    if (!zipFile) {
      setMessage("Select a ZIP file first.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", zipFile);
    const response = await fetch(`/api/v1/projects/${projectId}/images/zip`, { method: "POST", body: formData });
    const payload = (await response.json()) as { imported?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "ZIP upload failed");
      return;
    }

    setMessage(`Mapped ${payload.imported ?? 0} images.`);
    await refreshProject();
  };

  const uploadSingleImage = async (event: FormEvent) => {
    event.preventDefault();
    if (!singleCardId.trim() || !singleImageFile) {
      setMessage("Provide both card ID and image.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("card_id", singleCardId.trim());
    formData.append("file", singleImageFile);
    const response = await fetch(`/api/v1/projects/${projectId}/images`, { method: "POST", body: formData });
    const payload = (await response.json()) as { error?: string };
    setIsBusy(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Image mapping failed");
      return;
    }

    setMessage("Image mapped.");
    await refreshProject();
  };

  const runPreview = async () => {
    setIsBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/projects/${projectId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 }),
    });
    const payload = (await response.json()) as { previews?: Array<{ card_id: string; image: string }>; error?: string };
    setIsBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Preview failed");
      return;
    }
    setPreview(payload.previews ?? []);
  };

  const runRender = async () => {
    setIsBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/projects/${projectId}/render`, { method: "POST" });
    const payload = (await response.json()) as { renderedCards?: number; error?: string };
    setIsBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Render failed");
      return;
    }
    setMessage(`Render completed for ${payload.renderedCards ?? 0} cards.`);
    await refreshProject();
  };

  const downloadJob = async (jobId: string) => {
    const jobResponse = await fetch(`/api/v1/jobs/${jobId}`);
    const jobPayload = (await jobResponse.json()) as { download?: string; error?: string };
    if (!jobResponse.ok || !jobPayload.download) {
      setMessage(jobPayload.error ?? "Could not fetch job download endpoint");
      return;
    }

    window.open(jobPayload.download, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-900">Data import</h2>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={uploadCsv}>
          <input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
          <button disabled={isBusy} className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60">
            Upload CSV
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-900">Image mapping</h2>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={uploadZip}>
          <input type="file" accept=".zip,application/zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
          <button disabled={isBusy} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60">
            Upload ZIP
          </button>
        </form>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={uploadSingleImage}>
          <input
            value={singleCardId}
            onChange={(event) => setSingleCardId(event.target.value)}
            placeholder="card_id"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
          />
          <input type="file" accept="image/*" onChange={(event) => setSingleImageFile(event.target.files?.[0] ?? null)} />
          <button disabled={isBusy} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60">
            Upload single image
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-900">Render</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={isBusy} onClick={runPreview} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60">
            Render preview (5 cards)
          </button>
          <button disabled={isBusy} onClick={runRender} className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60">
            Full batch render
          </button>
        </div>
      </section>

      {preview.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold text-zinc-900">Preview</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {preview.map((item) => (
              <div key={item.card_id} className="rounded-md border border-zinc-200 p-2">
                <p className="mb-2 text-xs text-zinc-600">{item.card_id}</p>
                <Image unoptimized src={item.image} width={480} height={300} alt={item.card_id} className="h-auto w-full rounded" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-900">Jobs</h2>
        <div className="mt-3 space-y-2">
          {projectData.jobs.length ? (
            projectData.jobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2">
                <div className="text-sm">
                  <p className="font-medium text-zinc-900">{job.id}</p>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{job.status}</p>
                  {job.error ? <p className="text-xs text-red-600">{job.error}</p> : null}
                </div>
                {job.status === "completed" ? (
                  <button onClick={() => downloadJob(job.id)} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                    Download ZIP
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No jobs yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-900">Loaded data snapshot</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Cards: {projectData.cardData.length} | Images: {projectData.assets.length} | Status: {projectData.project.status}
        </p>
        <div className="mt-3 max-h-64 overflow-auto rounded-md border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-2 py-1">card_id</th>
                <th className="px-2 py-1">data</th>
              </tr>
            </thead>
            <tbody>
              {projectData.cardData.slice(0, 20).map((row) => (
                <tr key={row.id} className="border-t border-zinc-200">
                  <td className="px-2 py-1 font-mono text-zinc-800">{row.card_id}</td>
                  <td className="px-2 py-1 text-zinc-700">{JSON.stringify(row.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
};
