// ============================================
// QUICKARDS — Dashboard
// ============================================

import { ArrowRight, FileImage, LayoutTemplate, Plus, Users } from "lucide-react";
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
        title="Your workspace"
        subtitle="A calm place to design, prepare, and deliver every card batch."
        action={<Link href="/templates/new" className="hidden items-center gap-2 rounded-[var(--k-radius)] bg-[var(--k-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--k-accent)_24%,transparent)] sm:inline-flex"><Plus className="size-4" />New template</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Templates" value={templates.length} icon={<LayoutTemplate className="size-5" />} href="/templates" />
        <Stat label="Projects" value={projects.length} icon={<FileImage className="size-5" />} href="/projects" />
        <Stat label="Workspace" value={scope.role} icon={<Users className="size-5" />} href="/settings/organization" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.28fr_.72fr]">
        <div className="rounded-[calc(var(--k-radius)+7px)] border border-[var(--k-accent-border)] bg-[linear-gradient(135deg,var(--k-accent-soft),var(--k-surface)_48%)] p-6 shadow-[var(--k-shadow)] sm:p-8">
          <p className="qk-kicker">Start here</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Turn your roster into polished cards.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--k-text-muted)]">Create a reusable template first, then feed it a spreadsheet and a folder of photos whenever you need a new batch.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/templates/new" className="inline-flex items-center gap-2 rounded-[var(--k-radius)] bg-[var(--k-accent)] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Create template</Link><Link href="/projects/new" className="inline-flex items-center gap-2 rounded-[var(--k-radius)] border border-[var(--k-border)] bg-[var(--k-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--k-text)]">New project <ArrowRight className="size-4" /></Link></div>
        </div>
        <div className="rounded-[calc(var(--k-radius)+7px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)]">
          <p className="qk-kicker">Batch checklist</p>
          <ol className="mt-4 space-y-4">{["Design or select a template", "Import a CSV and photo ZIP", "Render and download output"].map((step, index) => <li key={step} className="flex items-center gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--k-surface-2)] text-xs font-bold text-[var(--k-text-muted)]">{index + 1}</span><span>{step}</span></li>)}</ol>
        </div>
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
      className="qk-panel-hover flex items-center gap-4 rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-5 shadow-[var(--k-shadow)]"
    >
      <div className="grid size-10 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]">
        {icon}
      </div>
      <div className="min-w-0">
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
      className="qk-panel-hover group relative rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-6 shadow-[var(--k-shadow)]"
    >
      <h3 className="font-semibold group-hover:text-[var(--k-accent)]">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--k-text-muted)]">{description}</p>
      <ArrowRight className="absolute bottom-6 right-6 size-4 text-[var(--k-text-faint)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--k-accent)]" />
    </Link>
  );
}
