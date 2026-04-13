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
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Create template</h1>
          <Link href="/" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            Back
          </Link>
        </div>
        <TemplateEditor />
      </div>
    </main>
  );
}
