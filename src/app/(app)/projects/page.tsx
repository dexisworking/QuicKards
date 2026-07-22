// ============================================
// QUICKARDS — Projects list
// ============================================

import { FileImage, Plus } from "lucide-react";
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
        <ul className="divide-y divide-[var(--k-border)] overflow-hidden rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)]">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--k-surface-hover)]"
              >
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-[var(--k-text-muted)]">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="rounded-full bg-[var(--k-surface-2)] px-3 py-1 text-xs text-[var(--k-text-muted)]">
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
