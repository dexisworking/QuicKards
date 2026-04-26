import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TemplateEditor } from "@/components/template/template-editor";
import { getCurrentUser } from "@/lib/api/auth";

export default async function NewTemplatePage() {
  const current = await getCurrentUser();
  if (!current.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen py-6">
      <div className="swiss-container max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Link href="/" className="transition-colors hover:text-[var(--accent)]">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[var(--foreground)]">New template</span>
            </nav>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">Create template</h1>
          </div>
          <Link href="/" className="swiss-btn-ghost text-xs">
            Back
          </Link>
        </div>
        <TemplateEditor />
      </div>
    </main>
  );
}
