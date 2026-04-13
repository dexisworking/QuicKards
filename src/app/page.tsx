import Image from "next/image";
import Link from "next/link";
import { Query } from "node-appwrite";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ResourceList } from "@/components/dashboard/resource-list";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { getCurrentUser } from "@/lib/api/auth";
import { getAppwriteSessionServices } from "@/lib/appwrite/client";
import { appwriteCollections } from "@/lib/appwrite/collections";
import { toProjectRecord, toTemplateRecord } from "@/lib/appwrite/records";
import { serverEnv } from "@/lib/env/server";
import { getExpiryCountdown, isExpiredResource } from "@/lib/expiry";

const features = [
  {
    title: "Visual card composer",
    description: "Build branded card layouts with reusable text, photo, and QR placeholders.",
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

const creditsLinks = [
  { label: "GitHub", href: "https://github.com/dexisworking" },
  { label: "Twitter", href: "https://x.com/SekharDibyanshu" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/dibyanshusekhar/" },
  { label: "Instagram", href: "https://instagram.com/dexisreal" },
  { label: "PORTFOLIO", href: "https://iamdex.codes/" },
  { label: "Coffee", href: "https://buymeacoffee.com/dexisworking" },
];

const creditsOwner = "© 2026 Dibyanshu Sekhar";

export default async function Home() {
  const current = await getCurrentUser();

  if (!current.user || !current.sessionSecret) {
    return (
      <main className="min-h-screen pb-10">
        <section className="border-b border-zinc-300/70 bg-zinc-50/80 backdrop-blur">
          <div className="swiss-container flex items-center justify-between py-4">
            <p className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-sm font-semibold tracking-tight text-transparent">
              QuicKards
            </p>
            <a href="#access" className="swiss-btn-ghost">
              Sign in
            </a>
          </div>
        </section>

        <section className="swiss-grid-bg border-b border-zinc-300/70 bg-zinc-50/70 py-16">
          <div className="swiss-container grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              <p className="swiss-kicker">Creative badge studio</p>
              <h1 className="max-w-3xl bg-gradient-to-r from-indigo-700 via-violet-600 to-cyan-500 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
                Design once. Import data. Export production-ready ID cards in minutes.
              </h1>
              <p className="max-w-2xl text-base text-zinc-600">
                QuicKards is built for festival teams, departments, and event operators who need clean, repeatable badge output at scale.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 shadow-sm">Template engine</span>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 shadow-sm">CSV pipeline</span>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 shadow-sm">Image matching</span>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 shadow-sm">PDF/ZIP export</span>
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

        <footer className="border-t border-zinc-300">
          <div className="swiss-container flex flex-col gap-3 py-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Image src="/quickards_favicon.png" alt="QuicKards favicon" width={12} height={12} className="h-3 w-3 rounded-sm" />
              {creditsOwner}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {creditsLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="uppercase tracking-wide hover:text-zinc-900">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
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

  const allTemplates = templatesResult.documents.map((document) => toTemplateRecord(document));
  const allProjects = projectsResult.documents.map((document) => toProjectRecord(document));
  const templates = allTemplates.filter((item) => !isExpiredResource(item.created_at));
  const projects = allProjects.filter((item) => !isExpiredResource(item.created_at));
  const expiredTemplates = allTemplates.filter((item) => isExpiredResource(item.created_at));
  const expiredProjects = allProjects.filter((item) => isExpiredResource(item.created_at));

  if (expiredTemplates.length > 0 || expiredProjects.length > 0) {
    await Promise.allSettled([
      ...expiredTemplates.map((item) =>
        databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.templates, item.id),
      ),
      ...expiredProjects.map((item) =>
        databases.deleteDocument(serverEnv.appwriteDatabaseId, appwriteCollections.projects, item.id),
      ),
    ]);
  }
  const nearestExpiry = [...projects.map((item) => item.created_at), ...templates.map((item) => item.created_at)]
    .sort()
    .at(0);

  return (
    <main className="min-h-screen pb-8">
      <header className="border-b border-zinc-300/70 bg-zinc-50/80 backdrop-blur">
        <div className="swiss-container flex items-center justify-between py-4">
          <div>
            <p className="swiss-kicker">Workspace</p>
            <h1 className="bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-2xl font-semibold text-transparent">QuicKards Dashboard</h1>
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

        <section className="swiss-section border-amber-300 bg-amber-50 p-4">
          <p className="swiss-kicker text-amber-700">Auto-expiry policy</p>
          <p className="mt-1 text-sm text-amber-900">
            Projects and templates are automatically deleted after 36 hours from creation.
            {nearestExpiry ? ` Next expiry window: ${getExpiryCountdown(nearestExpiry)}.` : ""}
          </p>
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
            <ResourceList title="Projects" type="project" items={projects} />
            <ResourceList title="Templates" type="template" items={templates} />
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-300">
        <div className="swiss-container flex flex-col gap-3 py-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Image src="/quickards_favicon.png" alt="QuicKards favicon" width={12} height={12} className="h-3 w-3 rounded-sm" />
            {creditsOwner}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {creditsLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="uppercase tracking-wide hover:text-zinc-900">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
