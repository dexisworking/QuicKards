// ============================================
// QUICKARDS — Batches
// ============================================
//
// Batches are records, so they are set as a ruled table with tabular figures —
// a manifest, not a grid of cards.

import { Plus } from "lucide-react";
import Link from "next/link";

import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  data_uploaded: "Roster in",
  images_uploaded: "Photos in",
  rendering: "Rendering",
  rendered: "Delivered",
  failed: "Failed",
};

/** Only the states that need attention earn colour. */
const STATUS_TONE: Record<string, string> = {
  rendering: "text-[var(--k-accent)]",
  failed: "text-[var(--k-danger)]",
  rendered: "text-[var(--k-success)]",
};

export default async function ProjectsPage() {
  const scope = await requireOrgScope();
  const projects = await scoped(scope).projects.list();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--k-border)] pb-6">
        <div>
          <span className="qk-kicker">Production</span>
          <h1 className="qk-display mt-3 text-[clamp(1.9rem,4vw,2.6rem)]">Batches</h1>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-[var(--k-radius)] bg-[var(--k-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--k-accent-hover)]"
        >
          <Plus className="size-4" />
          New batch
        </Link>
      </header>

      {projects.length === 0 ? (
        <div className="max-w-md py-8">
          <p className="text-sm leading-7 text-[var(--k-text-muted)]">
            No batches yet. A batch pairs one template with a roster and a folder
            of photos, then renders the whole set to a print-ready PDF and ZIP.
          </p>
          <Link
            href="/projects/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--k-accent)] underline-offset-4 hover:underline"
          >
            <Plus className="size-4" />
            Start your first batch
          </Link>
        </div>
      ) : (
        <div>
          <div className="qk-kicker grid grid-cols-[1fr_7rem_6rem] gap-4 border-b border-[var(--k-border)] pb-2.5">
            <span>Batch</span>
            <span>Status</span>
            <span className="text-right">Updated</span>
          </div>
          <ul className="qk-ruled-app">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="grid grid-cols-[1fr_7rem_6rem] items-center gap-4 py-4 transition-colors hover:text-[var(--k-accent)]"
                >
                  <span className="truncate text-sm font-medium">{project.name}</span>
                  <span
                    className={`text-xs ${STATUS_TONE[project.status] ?? "text-[var(--k-text-muted)]"}`}
                  >
                    {STATUS_LABEL[project.status] ?? project.status}
                  </span>
                  <span className="qk-num text-right text-xs text-[var(--k-text-faint)]">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
