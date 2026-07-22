// ============================================
// QUICKARDS — Templates list
// ============================================

import { LayoutTemplate, Plus } from "lucide-react";
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
    <div className="space-y-6">
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}`}
                className="block rounded-[calc(var(--k-radius)+4px)] border border-[var(--k-border)] bg-[var(--k-surface)] p-5 shadow-[var(--k-shadow)] transition-colors hover:border-[var(--k-accent-border)]"
              >
                <div className="mb-3 aspect-[1.586/1] rounded-[var(--k-radius)] bg-[var(--k-surface-2)]" />
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-[var(--k-text-muted)]">
                  Updated {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
