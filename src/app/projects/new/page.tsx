import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteSessionServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

export default async function NewProjectPage() {
  const current = await getCurrentUser();

  if (!current.user || !current.sessionSecret) {
    redirect("/");
  }

  const { databases } = getAppwriteSessionServices(current.sessionSecret);
  const templates = await databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.templates, [
    Query.equal("userId", current.user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(500),
  ]);

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Create project</h1>
          <Link href="/" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            Back
          </Link>
        </div>
        <CreateProjectForm templates={templates.documents.map((document) => toTemplateRecord(document))} />
      </div>
    </main>
  );
}
