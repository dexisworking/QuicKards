"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import Button from "@/components/ui/Button";

type PresignResult = {
  fontId: string;
  url: string;
  contentType: string;
};

export default function FontUploadPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [weight, setWeight] = useState(400);
  const [style, setStyle] = useState<"normal" | "italic">("normal");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const disabled = useMemo(
    () => busy || !file || name.trim().length === 0 || family.trim().length === 0,
    [busy, file, name, family],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || disabled) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const presign = await fetch("/api/fonts/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          family: family.trim(),
          filename: file.name,
          weight,
          style,
          byteSize: file.size,
        }),
      });

      const data = (await presign.json().catch(() => null)) as
        | PresignResult
        | { error?: string }
        | null;
      if (!presign.ok || !data || !("url" in data)) {
        setError(data && "error" in data && data.error ? data.error : "Could not start font upload");
        return;
      }

      const upload = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!upload.ok) {
        setError("Font upload failed. Please try again.");
        return;
      }

      setMessage("Font uploaded. It is now available in your templates.");
      setFile(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[calc(var(--k-radius)+6px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-5 shadow-[var(--k-shadow)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]">
          <Upload className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Upload custom font</h2>
          <p className="mt-1 text-sm text-[var(--k-text-muted)]">
            Add a .ttf or .otf file to use the same face in editor preview and final renders.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Font file</span>
          <input
            className="mt-2 block w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2 text-sm"
            type="file"
            accept=".ttf,.otf,font/ttf,font/otf"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              if (next && !name) setName(next.name.replace(/\.[^.]+$/, ""));
              if (next && !family) setFamily(next.name.replace(/\.[^.]+$/, ""));
            }}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-medium">Display name</span>
          <input
            className="mt-2 block w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-medium">Font family</span>
          <input
            className="mt-2 block w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2 text-sm"
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            maxLength={120}
            required
          />
        </label>

        <label className="text-sm">
          <span className="font-medium">Weight</span>
          <input
            className="mt-2 block w-full rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-bg)] px-3 py-2 text-sm"
            type="number"
            min={100}
            max={900}
            step={100}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value) || 400)}
            required
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Style</legend>
        <div className="mt-2 flex gap-2">
          {(["normal", "italic"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStyle(value)}
              className={
                "rounded-[var(--k-radius)] border px-3 py-1.5 text-sm transition " +
                (style === value
                  ? "border-[var(--k-accent)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]"
                  : "border-[var(--k-border)] text-[var(--k-text-muted)] hover:text-[var(--k-text)]")
              }
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p className="mt-4 rounded-[var(--k-radius)] bg-[color-mix(in_srgb,var(--k-danger)_10%,transparent)] px-3 py-2 text-sm text-[var(--k-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-[var(--k-radius)] bg-[color-mix(in_srgb,var(--k-success)_12%,transparent)] px-3 py-2 text-sm text-[var(--k-success)]">
          {message}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={busy} disabled={disabled}>
          Upload font
        </Button>
      </div>
    </form>
  );
}
