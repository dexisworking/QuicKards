// ============================================
// QUICKARDS — Landing page
// ============================================

import { ArrowRight, Check, FileSpreadsheet, ImageIcon, Layers, Sparkles, Zap } from "lucide-react";
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
        <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="absolute -left-32 top-8 size-96 rounded-full bg-red/10 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-red/25 bg-red-pale px-3 py-1.5 text-xs font-semibold tracking-wide text-red-accent">
              <Sparkles className="size-3.5" /> Built for batch work, not busywork
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
              Bulk ID cards,
              <br />
              <span className="gradient-text-red">designed once</span>, rendered by the thousand.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary lg:text-left">
              Design a card in a focused editor, import a spreadsheet, map photos by ID, and export print-ready PDFs. Built for colleges, events, and teams.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-red px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-red-accent hover:shadow-[0_0_40px_rgba(220,38,38,0.25)]"
            >
              Start free <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/sign-in"
              className="rounded-[var(--radius-md)] border border-rule-light px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-red/40"
            >
              Sign in
            </Link>
            <Link
              href="/gallery"
              className="rounded-[var(--radius-md)] border border-rule-light px-6 py-3 text-sm font-semibold text-text-secondary transition-colors hover:border-red/40 hover:text-ink"
            >
              Browse gallery
            </Link>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-text-muted lg:justify-start">
              {["No credit card", "CSV + photo ZIP", "Print-ready export"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-green" />{item}</span>)}
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-accent">A calmer batch workflow</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Everything stays connected.</h2>
          <p className="mt-3 text-text-secondary">One workspace brings your design, data, photos, and final delivery together.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-[var(--radius-lg)] border border-rule bg-surface p-6 transition-all hover:-translate-y-1 hover:border-red/30 hover:shadow-[0_16px_32px_rgba(0,0,0,0.25)]"
            >
              <div className="mb-4 grid size-10 place-items-center rounded-[var(--radius-md)] bg-red-pale text-red-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold transition-colors group-hover:text-red-accent">{title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-rule bg-bg-secondary">
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

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-[24px] border border-rule-light bg-surface p-3 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-1.5 border-b border-rule px-2 pb-3 text-[10px] text-text-muted"><span className="size-2 rounded-full bg-red-accent" /><span className="size-2 rounded-full bg-amber" /><span className="size-2 rounded-full bg-green" /><span className="ml-2">Student badge · Preview</span></div>
      <div className="mt-3 rounded-xl bg-[#d6d7db] p-5">
        <div className="relative aspect-[1.586/1] overflow-hidden rounded-lg bg-[#17212e] shadow-xl">
          <div className="absolute inset-x-0 top-0 h-12 bg-red" />
          <div className="absolute left-5 top-5 text-[9px] font-bold tracking-[.2em] text-white">NORTHSTAR COLLEGE</div>
          <div className="absolute left-5 top-20 size-16 rounded-md border-2 border-white/75 bg-gradient-to-br from-zinc-300 to-zinc-500" />
          <div className="absolute left-24 top-20 text-[9px] text-zinc-400">STUDENT</div>
          <div className="absolute left-24 top-[5.8rem] text-sm font-bold text-white">Ananya Verma</div>
          <div className="absolute left-24 top-[7.25rem] text-[9px] text-zinc-400">BSC · Computer Science</div>
          <div className="absolute bottom-4 right-4 grid size-11 grid-cols-4 gap-px bg-white p-1">{Array.from({ length: 16 }).map((_, index) => <span key={index} className={index % 3 === 0 || index % 5 === 0 ? "bg-zinc-900" : "bg-white"} />)}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2"><div className="h-7 rounded bg-red/15" /><div className="h-7 rounded bg-bg-elevated" /><div className="h-7 rounded bg-bg-elevated" /></div>
    </div>
  );
}
