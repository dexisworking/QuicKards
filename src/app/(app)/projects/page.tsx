// ============================================
// QUICKARDS — Projects list
// ============================================

import { ArrowRight, FileImage, Plus } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  data_uploaded: "Data uploaded",
  images_uploaded: "Photos uploaded",
  rendering: "Rendering…",
  rendered: "Rendered",
  failed: "Failed",
};

export default async function ProjectsPage() {
  const scope = await requireOrgScope();
  const projects = await scoped(scope).projects.list();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Each project is one batch: a template, your rows, and the rendered output."
        action={
          <Button href="/projects/new" icon={<Plus className="size-4" />}>
            New project
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FileImage className="size-8" />}
          title="No projects yet"
          description="Create a project, import a CSV and a folder of photos, and render a print-ready batch."
          action={
            <Button href="/projects/new" icon={<Plus className="size-4" />}>
              New project
            </Button>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] shadow-[var(--k-shadow)]">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="group flex items-center justify-between gap-4 border-b border-[var(--k-border)] px-5 py-4 last:border-b-0 transition-colors hover:bg-[var(--k-surface-hover)] sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]"><FileImage className="size-4" /></div><div className="min-w-0">
                  <div className="truncate font-semibold">{project.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--k-text-muted)]">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div></div>
                <div className="flex shrink-0 items-center gap-3"><ProjectStatus status={project.status} /><ArrowRight className="size-4 text-[var(--k-text-faint)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--k-accent)]" /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const isRendered = status === "rendered";
  const isFailed = status === "failed";
  const isWorking = status === "rendering";
  const tone = isRendered ? "text-[var(--k-success)] bg-[color-mix(in_srgb,var(--k-success)_10%,transparent)]" : isFailed ? "text-[var(--k-danger)] bg-[color-mix(in_srgb,var(--k-danger)_10%,transparent)]" : isWorking ? "text-[var(--k-warning)] bg-[color-mix(in_srgb,var(--k-warning)_10%,transparent)]" : "text-[var(--k-text-muted)] bg-[var(--k-surface-2)]";
  return <span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${tone}`}><span className="qk-status-dot" />{STATUS_LABEL[status] ?? status}</span>;
}
