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
    <main className="min-h-screen py-6">
      <div className="swiss-container max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="swiss-kicker">Project setup</p>
            <h1 className="text-2xl font-semibold text-zinc-900">Create project</h1>
          </div>
          <Link href="/" className="swiss-btn-ghost">
            Back
          </Link>
        </div>
        <CreateProjectForm templates={templates.documents.map((document) => toTemplateRecord(document))} />
      </div>
    </main>
  );
}
