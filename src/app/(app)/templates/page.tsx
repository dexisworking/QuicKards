// ============================================
// QUICKARDS — Templates list
// ============================================

import { ArrowUpRight, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import { requireOrgScope } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scope";

export default async function TemplatesPage() {
  const scope = await requireOrgScope();
  const templates = await scoped(scope).templates.list();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Templates"
        subtitle="Card designs you render batches from."
        action={
          <Button href="/templates/new" icon={<Plus className="size-4" />}>
            New template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="size-8" />}
          title="No templates yet"
          description="Design your first card in the editor — text, photos, and QR codes, all bindable to your data."
          action={
            <Button href="/templates/new" icon={<Plus className="size-4" />}>
              New template
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}`}
                className="qk-panel-hover group block overflow-hidden rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] shadow-[var(--k-shadow)]"
              >
                <div className="relative m-3 aspect-[1.586/1] overflow-hidden rounded-[var(--k-radius)] bg-[linear-gradient(135deg,var(--k-surface-2),var(--k-bg))]">
                  <div className="absolute inset-x-0 top-0 h-1/3 bg-[var(--k-accent)]/85" />
                  <div className="absolute left-5 top-[42%] size-11 rounded-md bg-[var(--k-text)]/15" />
                  <div className="absolute left-20 top-[45%] h-2 w-20 rounded bg-[var(--k-text)]/20" /><div className="absolute left-20 top-[58%] h-1.5 w-14 rounded bg-[var(--k-text)]/10" />
                  <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-[var(--k-surface)]/85 text-[var(--k-accent)] opacity-0 transition-opacity group-hover:opacity-100"><ArrowUpRight className="size-4" /></span>
                </div>
                <div className="flex items-start gap-3 px-5 pb-5"><div className="grid size-9 shrink-0 place-items-center rounded-[var(--k-radius)] bg-[var(--k-accent-soft)] text-[var(--k-accent)]"><LayoutTemplate className="size-4" /></div><div className="min-w-0"><div className="truncate font-semibold">{template.name}</div>
                <div className="mt-0.5 text-xs text-[var(--k-text-muted)]">
                  Updated {new Date(template.updatedAt).toLocaleDateString()}
                </div></div></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {templates.length > 0 ? <div className="flex items-center gap-2 rounded-[var(--k-radius)] border border-dashed border-[var(--k-border)] px-4 py-3 text-xs text-[var(--k-text-muted)]"><Sparkles className="size-3.5 text-[var(--k-accent)]" />Open a template to adjust the layout, add data-bound fields, and save a new version automatically.</div> : null}
    </div>
  );
}
