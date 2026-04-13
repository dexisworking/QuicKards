import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Edit template</h1>
          <Link href="/" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
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
