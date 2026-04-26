import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TemplateEditor } from "@/components/template/template-editor";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteSessionServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

type PageContext = {
  params: Promise<{ id: string }>;
};

export default async function EditTemplatePage(context: PageContext) {
  const { id } = await context.params;
  const current = await getCurrentUser();

  if (!current.user || !current.sessionSecret) {
    redirect("/");
  }

  const { databases } = getAppwriteSessionServices(current.sessionSecret);

  let template;
  try {
    const templateDocument = await databases.getDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, id);
    template = toTemplateRecord(templateDocument);
  } catch {
    notFound();
  }

  if (template.user_id !== current.user.$id) {
    notFound();
  }

  return (
    <main className="min-h-screen py-6">
      <div className="swiss-container max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Link href="/" className="transition-colors hover:text-[var(--accent)]">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[var(--foreground)]">{template.name}</span>
            </nav>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">Edit template</h1>
          </div>
          <Link href="/" className="swiss-btn-ghost text-xs">
            Back
          </Link>
        </div>
        <TemplateEditor
          initialTemplate={{
            id: template.id,
            name: template.name,
            width: template.width,
            height: template.height,
            unit: template.unit,
            fields: template.fields,
            background_url: template.background_url,
          }}
        />
      </div>
    </main>
  );
}
