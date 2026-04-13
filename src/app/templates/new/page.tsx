import Link from "next/link";
import { redirect } from "next/navigation";
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
            <p className="swiss-kicker">Template studio</p>
            <h1 className="text-2xl font-semibold text-zinc-900">Create template</h1>
          </div>
          <Link href="/" className="swiss-btn-ghost">
            Back
          </Link>
        </div>
        <TemplateEditor />
      </div>
    </main>
  );
}
