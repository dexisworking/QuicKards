// ============================================
// QUICKARDS — Landing page
// ============================================

import { FileSpreadsheet, ImageIcon, Layers, Zap } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Layers,
    title: "One design, every card",
    body: "A single document model drives both the editor and the render — what you design is exactly what prints, at any scale.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV that just maps",
    body: "Import a spreadsheet and bind columns to fields. Fuzzy header matching means \"Full Name\" finds full_name.",
  },
  {
    icon: ImageIcon,
    title: "Photos by ID",
    body: "Drop a ZIP of photos named by card ID and every face lands on the right card automatically.",
  },
  {
    icon: Zap,
    title: "Batches that finish",
    body: "Renders run on a queue with live progress — thousands of cards to print-ready PDF + ZIP without timeouts.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="bg-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <span className="inline-block rounded-full border border-rule bg-surface px-3 py-1 text-xs font-medium tracking-wide text-text-secondary">
            A DexForge product
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Bulk ID cards,
            <br />
            <span className="gradient-text-red">designed once</span>, rendered by the thousand.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            Design a card in a Canva-style editor, import a spreadsheet, map photos by ID, and
            export print-ready PDFs. Built for colleges, festivals, events, and teams.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-[var(--radius-md)] bg-red px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-accent hover:shadow-[0_0_40px_rgba(220,38,38,0.25)]"
            >
              Start free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-[var(--radius-md)] border border-rule-light px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-red/40"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[var(--radius-lg)] border border-rule bg-surface p-6 transition-colors hover:border-red/30"
            >
              <div className="mb-4 grid size-10 place-items-center rounded-[var(--radius-md)] bg-red-pale text-red-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to print a batch?</h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            Create a free workspace and design your first card in minutes.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block rounded-[var(--radius-md)] bg-red px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-accent hover:shadow-[0_0_40px_rgba(220,38,38,0.25)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
