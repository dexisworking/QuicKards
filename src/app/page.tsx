import Image from "next/image";
import Link from "next/link";
import { Query } from "node-appwrite";
import {
  LayoutTemplate,
  Database,
  ImageIcon,
  FileOutput,
  ArrowRight,
  Layers,
  Clock,
  FolderKanban,
  Plus,
} from "lucide-react";
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
    icon: <LayoutTemplate className="h-5 w-5" />,
    title: "Visual card composer",
    description:
      "Build branded card layouts with reusable text, photo, and QR placeholders on an interactive canvas.",
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: "CSV + image mapping",
    description:
      "Import rows and map photos by card_id through ZIP or one-by-one upload — your data, your rules.",
  },
  {
    icon: <FileOutput className="h-5 w-5" />,
    title: "Server-side batch rendering",
    description:
      "Generate consistent cards on the backend and export as PDF + ZIP, ready for production.",
  },
];

const featurePills = ["Template engine", "CSV pipeline", "Image matching", "PDF/ZIP export"];

const creditsLinks = [
  { label: "GitHub", href: "https://github.com/dexisworking" },
  { label: "Twitter", href: "https://x.com/SekharDibyanshu" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/dibyanshusekhar/" },
  { label: "Instagram", href: "https://instagram.com/dexisreal" },
  { label: "Portfolio", href: "https://iamdex.codes/" },
  { label: "Coffee", href: "https://buymeacoffee.com/dexisworking" },
];

const creditsOwner = "© 2026 Dibyanshu Sekhar";

export default async function Home() {
  const current = await getCurrentUser();

  /* ─────────── Unauthenticated Landing ─────────── */
  if (!current.user || !current.sessionSecret) {
    return (
      <main className="min-h-screen">
        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-30 border-b border-[var(--line)] swiss-glass">
          <div className="swiss-container flex items-center justify-between py-3.5">
            <div className="flex items-center gap-2.5">
              <Image
                src="/quickards_favicon.png"
                alt="QuicKards"
                width={24}
                height={24}
                className="rounded-md"
              />
              <span className="text-sm font-bold tracking-tight">QuicKards</span>
            </div>
            <a href="#access" className="swiss-btn text-xs">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="swiss-mesh-bg border-b border-[var(--line)] py-20 md:py-28">
          <div className="swiss-container grid gap-10 lg:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <p className="swiss-kicker">Bulk identity card automation</p>
              <h1 className="swiss-heading max-w-3xl text-4xl md:text-5xl lg:text-[3.25rem]">
                Design once. Import data.{" "}
                <span className="swiss-gradient-text">Export production-ready</span> ID cards
                in minutes.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--muted)]">
                QuicKards is built for festival teams, departments, and event operators who need
                clean, repeatable badge output at scale.
              </p>
              <div className="flex flex-wrap gap-2">
                {featurePills.map((pill) => (
                  <span
                    key={pill}
                    className="swiss-badge swiss-badge-accent"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div id="access" className="flex items-start">
              <AuthPanel />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="swiss-container grid gap-4 py-12 md:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="swiss-section p-6 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                {feature.icon}
              </div>
              <p className="swiss-kicker mb-1">Step {index + 1}</p>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-[var(--line)]">
          <div className="swiss-container flex flex-col gap-3 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Image
                src="/quickards_favicon.png"
                alt="QuicKards favicon"
                width={14}
                height={14}
                className="rounded-sm"
              />
              {creditsOwner}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {creditsLinks.map((link, index) => (
                <span key={link.label} className="inline-flex items-center gap-1.5">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-[var(--accent)]"
                  >
                    {link.label}
                  </a>
                  {index < creditsLinks.length - 1 && <span className="swiss-separator" />}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </main>
    );
  }

  /* ─────────── Authenticated Dashboard ─────────── */
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
      {/* ── Dashboard Header ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] swiss-glass">
        <div className="swiss-container flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <Image
              src="/quickards_favicon.png"
              alt="QuicKards"
              width={24}
              height={24}
              className="rounded-md"
            />
            <div>
              <p className="text-sm font-bold tracking-tight">QuicKards</p>
              <p className="text-[0.65rem] text-[var(--muted)]">
                Welcome back
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="swiss-container space-y-5 py-6">
        {/* ── Stats ── */}
        <section className="grid gap-3 md:grid-cols-3">
          <div className="swiss-section p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <p className="swiss-kicker">Projects</p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--foreground)]">{projects.length}</p>
              </div>
            </div>
          </div>
          <div className="swiss-section p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="swiss-kicker">Templates</p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--foreground)]">{templates.length}</p>
              </div>
            </div>
          </div>
          <div className="swiss-section p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="swiss-kicker">Latest update</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {projects[0] ? new Date(projects[0].created_at).toLocaleDateString() : "No activity yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Expiry notice ── */}
        <section className="flex items-start gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-light)] px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">Auto-expiry policy</p>
            <p className="mt-0.5 text-sm text-[var(--foreground)]">
              Projects and templates are automatically deleted after 36 hours from creation.
              {nearestExpiry ? ` Next expiry window: ${getExpiryCountdown(nearestExpiry)}.` : ""}
            </p>
          </div>
        </section>

        {/* ── Action grid ── */}
        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <CreateProjectForm templates={templates.map((item) => ({ id: item.id, name: item.name }))} />

            <div className="swiss-section-accent p-5">
              <p className="swiss-kicker">Template workspace</p>
              <h2 className="mt-1.5 text-base font-semibold text-[var(--foreground)]">Create a new template</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Build reusable layouts for any card batch run.</p>
              <Link
                href="/templates/new"
                className="swiss-btn mt-4 inline-flex text-sm"
              >
                <Plus className="h-4 w-4" />
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

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--line)]">
        <div className="swiss-container flex flex-col gap-3 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Image
              src="/quickards_favicon.png"
              alt="QuicKards favicon"
              width={14}
              height={14}
              className="rounded-sm"
            />
            {creditsOwner}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {creditsLinks.map((link, index) => (
              <span key={link.label} className="inline-flex items-center gap-1.5">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-[var(--accent)]"
                >
                  {link.label}
                </a>
                {index < creditsLinks.length - 1 && <span className="swiss-separator" />}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
