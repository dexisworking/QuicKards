// ============================================
// QUICKARDS — Overview
// ============================================
//
// A work surface, not a welcome screen. The counts are set as data (tabular
// figures on a ruled band) and the two lists show what the user actually has,
// so the page is useful on the second visit as well as the first.

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { requireOrgScope } from "@/lib/auth/session";
import { planFor } from "@/lib/billing/plans";
import { activePlanKey, usageFor } from "@/lib/db/billing";
import { scoped } from "@/lib/db/scope";

export default async function DashboardPage() {
  const scope = await requireOrgScope();
  const repo = scoped(scope);

  const [templates, projects, planKey, usage] = await Promise.all([
    repo.templates.list(),
    repo.projects.list(),
    activePlanKey(scope.organizationId),
    usageFor(scope.organizationId),
  ]);
  const plan = planFor(planKey);

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="qk-kicker">Workspace</span>
          <h1 className="qk-display mt-3 text-[clamp(1.9rem,4vw,2.6rem)]">Overview</h1>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 rounded-[var(--k-radius)] bg-[var(--k-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--k-accent-hover)]"
        >
          <Plus className="size-4" />
          New template
        </Link>
      </header>

      {/* Measured band — the same device as the marketing spec strip. The
          gap-px over a border-coloured background draws exact hairlines
          between cells at every breakpoint without per-cell border rules. */}
      <dl className="grid grid-cols-2 gap-px border-y border-[var(--k-border)] bg-[var(--k-border)] lg:grid-cols-4">
        <Metric label="Templates" value={templates.length} />
        <Metric label="Batches" value={projects.length} />
        <Metric
          label="Cards this month"
          value={`${usage.used.toLocaleString()} / ${plan.cardsPerPeriod.toLocaleString()}`}
        />
        <Metric label="Plan" value={plan.name} />
      </dl>

      <div className="grid gap-12 lg:grid-cols-2">
        <Panel
          title="Templates"
          href="/templates"
          empty="No templates yet — design the card once and reuse it for every batch."
          items={templates.slice(0, 5).map((template) => ({
            id: template.id,
            href: `/templates/${template.id}`,
            primary: template.name,
            secondary: new Date(template.updatedAt).toLocaleDateString(),
          }))}
        />
        <Panel
          title="Batches"
          href="/projects"
          empty="No batches yet — a batch pairs a template with your roster and photos."
          items={projects.slice(0, 5).map((project) => ({
            id: project.id,
            href: `/projects/${project.id}`,
            primary: project.name,
            secondary: project.status.replaceAll("_", " "),
          }))}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--k-bg)] px-5 py-6">
      <dt className="qk-num text-2xl font-bold capitalize tracking-tight">{value}</dt>
      <dd className="qk-kicker mt-2">{label}</dd>
    </div>
  );
}

function Panel({
  title,
  href,
  items,
  empty,
}: {
  title: string;
  href: string;
  items: Array<{ id: string; href: string; primary: string; secondary: string }>;
  empty: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-[var(--k-border)] pb-3">
        <h2 className="qk-kicker">{title}</h2>
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-xs font-medium text-[var(--k-text-muted)] transition-colors hover:text-[var(--k-text)]"
        >
          View all
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="max-w-sm py-8 text-sm leading-6 text-[var(--k-text-muted)]">{empty}</p>
      ) : (
        <ul className="qk-ruled-app">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-baseline justify-between gap-4 py-3.5 transition-colors hover:text-[var(--k-accent)]"
              >
                <span className="truncate text-sm font-medium">{item.primary}</span>
                <span className="qk-num shrink-0 text-xs capitalize text-[var(--k-text-faint)]">
                  {item.secondary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
