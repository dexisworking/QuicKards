// ============================================
// QUICKARDS — Dashboard
// ============================================

import { FileImage, LayoutTemplate, Users } from "lucide-react";
import Link from "next/link";

import PageHeader from "@/components/app/PageHeader";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

export default async function DashboardPage() {
  const scope = await requireOrgScope();
  const repo = scoped(scope);
  const [templates, projects] = await Promise.all([repo.templates.list(), repo.projects.list()]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Design a card, import your data, render the batch."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Templates" value={templates.length} icon={<LayoutTemplate className="size-5" />} href="/templates" />
        <Stat label="Projects" value={projects.length} icon={<FileImage className="size-5" />} href="/projects" />
        <Stat label="Workspace" value={scope.role} icon={<Users className="size-5" />} href="/settings/organization" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          title="Design a template"
          description="Lay out a card in the editor — text, photos, QR codes, all data-bindable."
          href="/templates/new"
        />
        <ActionCard
          title="Start a project"
          description="Import a CSV and a folder of photos, then render a print-ready batch."
          href="/projects/new"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-5 shadow-[var(--k-shadow)] transition-colors hover:bg-[var(--k-surface-hover)]"
    >
      <div className="grid size-10 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold capitalize">{value}</div>
        <div className="text-xs text-[var(--k-text-muted)]">{label}</div>
      </div>
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)] transition-colors hover:border-[var(--k-accent-border)]"
    >
      <h3 className="font-semibold group-hover:text-[var(--k-accent)]">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--k-text-muted)]">{description}</p>
    </Link>
  );
}
