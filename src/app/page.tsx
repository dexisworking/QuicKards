import Link from "next/link";
import { Query } from "node-appwrite";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteAdminServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord, toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

export default async function Home() {
  const current = await getCurrentUser();

  if (!current.user) {
    return (
      <main className="min-h-screen bg-zinc-100 p-6 flex items-center justify-center">
        <AuthPanel />
      </main>
    );
  }

  const { databases } = getAppwriteAdminServices();

  const [templatesResult, projectsResult] = await Promise.all([
    databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.templates, [
      Query.equal("userId", current.user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]),
    databases.listDocuments(serverEnv.appwriteDatabaseId, appwriteCollections.projects, [
      Query.equal("userId", current.user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]),
  ]);

  const templates = templatesResult.documents.map((document) => toTemplateRecord(document));
  const projects = projectsResult.documents.map((document) => toProjectRecord(document));

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">QuicKards</h1>
            <p className="text-sm text-zinc-600">Bulk ID card generation with template + CSV + image mapping.</p>
          </div>
          <SignOutButton />
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <CreateProjectForm templates={templates.map((item) => ({ id: item.id, name: item.name }))} />
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold text-zinc-900">Templates</h2>
              <Link href="/templates/new" className="mt-2 inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800">
                New template
              </Link>
            </div>
          </div>

          <section className="md:col-span-2 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-zinc-900">Projects</h2>
            <div className="mt-3 space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-zinc-600">No projects yet.</p>
              ) : (
                projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                  >
                    <span className="text-sm text-zinc-900">{project.name}</span>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">{project.status}</span>
                  </Link>
                ))
              )}
            </div>

            <h3 className="mt-6 text-base font-semibold text-zinc-900">Saved templates</h3>
            <div className="mt-3 space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-zinc-600">No templates yet.</p>
              ) : (
                templates.map((template) => (
                  <Link
                    key={template.id}
                    href={`/templates/${template.id}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                  >
                    <span className="text-sm text-zinc-900">{template.name}</span>
                    <span className="text-xs text-zinc-500">{new Date(template.created_at).toLocaleDateString()}</span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
