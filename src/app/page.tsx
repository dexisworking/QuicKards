import Link from "next/link";
import { Query } from "node-appwrite";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteSessionServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord, toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";

const features = [
  {
    title: "Swiss-style template editor",
    description: "Place text, image, and QR zones with precise control on a Fabric canvas.",
  },
  {
    title: "CSV + image mapping",
    description: "Import rows and map photos by card_id through ZIP or one-by-one upload.",
  },
  {
    title: "Server-side batch rendering",
    description: "Generate consistent cards on the backend and export as PDF + ZIP.",
  },
];

export default async function Home() {
  const current = await getCurrentUser();

  if (!current.user || !current.sessionSecret) {
    return (
      <main className="min-h-screen pb-10">
        <section className="border-b border-zinc-300 bg-zinc-50">
          <div className="swiss-container flex items-center justify-between py-4">
            <p className="text-sm font-medium tracking-tight">QuicKards</p>
            <a href="#access" className="swiss-btn-ghost">
              Sign in
            </a>
          </div>
        </section>

        <section className="swiss-grid-bg border-b border-zinc-300 bg-zinc-50 py-14">
          <div className="swiss-container grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              <p className="swiss-kicker">Bulk identity card automation</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
                Design once. Import data. Export production-ready ID cards in minutes.
              </h1>
              <p className="max-w-2xl text-base text-zinc-600">
                QuicKards is built for festival teams, departments, and event operators who need clean, repeatable badge output at scale.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="border border-zinc-300 bg-white px-3 py-1">Template engine</span>
                <span className="border border-zinc-300 bg-white px-3 py-1">CSV pipeline</span>
                <span className="border border-zinc-300 bg-white px-3 py-1">Image matching</span>
                <span className="border border-zinc-300 bg-white px-3 py-1">PDF/ZIP export</span>
              </div>
            </div>

            <div id="access">
              <AuthPanel />
            </div>
          </div>
        </section>

        <section className="swiss-container grid gap-4 py-8 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="swiss-section p-5">
              <p className="swiss-kicker">Feature</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">{feature.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{feature.description}</p>
            </article>
          ))}
        </section>
      </main>
    );
  }

  const { databases } = getAppwriteSessionServices(current.sessionSecret);

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
    <main className="min-h-screen pb-8">
      <header className="border-b border-zinc-300 bg-zinc-50">
        <div className="swiss-container flex items-center justify-between py-4">
          <div>
            <p className="swiss-kicker">Workspace</p>
            <h1 className="text-2xl font-semibold text-zinc-900">QuicKards Dashboard</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="swiss-container space-y-5 py-6">
        <section className="grid gap-3 md:grid-cols-3">
          <div className="swiss-section p-4">
            <p className="swiss-kicker">Projects</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{projects.length}</p>
          </div>
          <div className="swiss-section p-4">
            <p className="swiss-kicker">Templates</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{templates.length}</p>
          </div>
          <div className="swiss-section p-4">
            <p className="swiss-kicker">Latest update</p>
            <p className="mt-2 text-sm text-zinc-600">{projects[0] ? new Date(projects[0].created_at).toLocaleDateString() : "No activity yet"}</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <CreateProjectForm templates={templates.map((item) => ({ id: item.id, name: item.name }))} />
            <div className="swiss-section p-5">
              <p className="swiss-kicker">Template workspace</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-900">Create a new template</h2>
              <p className="mt-2 text-sm text-zinc-600">Build reusable layouts for any card batch run.</p>
              <Link href="/templates/new" className="swiss-btn mt-4 inline-flex">
                New template
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <section className="swiss-section p-5">
              <p className="swiss-kicker">Projects</p>
              <div className="mt-3 space-y-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-zinc-600">No projects yet.</p>
                ) : (
                  projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
                    >
                      <span className="text-sm text-zinc-900">{project.name}</span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{project.status}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="swiss-section p-5">
              <p className="swiss-kicker">Templates</p>
              <div className="mt-3 space-y-2">
                {templates.length === 0 ? (
                  <p className="text-sm text-zinc-600">No templates yet.</p>
                ) : (
                  templates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/templates/${template.id}`}
                      className="flex items-center justify-between border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
                    >
                      <span className="text-sm text-zinc-900">{template.name}</span>
                      <span className="text-xs text-zinc-500">{new Date(template.created_at).toLocaleDateString()}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
