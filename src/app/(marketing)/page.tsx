// ============================================
// QUICKARDS — Landing page
// ============================================
//
// Structured like a production spec sheet, not a SaaS template: an asymmetric
// hero against a real card specimen, a band of true numbers, and the pipeline
// as three indexed steps separated by hairlines. No feature-card grid, no
// gradient headline, no glow — red appears only as signal.

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import CardSpecimen from "@/components/marketing/CardSpecimen";

/** Deliberately concrete. Real units and real constraints read as something
 *  someone built; round marketing numbers read as filler. */
const SPECS = [
  { value: "1012 × 638", label: "px per card at 300 dpi" },
  { value: "5,000", label: "rows per batch" },
  { value: "1", label: "renderer, editor and output" },
  { value: "PDF + ZIP", label: "print-ready output" },
];

const STEPS = [
  {
    index: "01",
    detail: "Editor",
    title: "Draw the card once",
    body: "Place text, photos and codes on a CR80 canvas. Every field can be fixed, bound to a spreadsheet column, or composed from a pattern like {{first_name}} {{last_name}}.",
  },
  {
    index: "02",
    detail: "Ingest",
    title: "Bring the roster",
    body: "Import a CSV and drop in a ZIP of photos named by ID. Headers match forgivingly — “Full Name” finds full_name — and each photo lands on the right card by filename.",
  },
  {
    index: "03",
    detail: "Output",
    title: "Render the batch",
    body: "Rendering runs on a queue, not in your browser tab. Thousands of cards become individual PNGs plus one combined PDF, with a report of anything that had to be substituted.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="qk-grain relative overflow-hidden border-b border-rule">
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20 lg:py-28">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-red" aria-hidden />
              <span className="qk-label text-text-muted">A DexForge product</span>
            </div>

            <h1 className="qk-display mt-8 text-[clamp(2.75rem,7vw,4.75rem)]">
              Design one card.
              <br />
              Print ten thousand.
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-8 text-text-secondary">
              QuicKards turns a single card design and a spreadsheet into
              print-ready ID cards — for universities, festivals, conferences and
              anyone who has ever laid out badges by hand.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-red px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-accent"
              >
                Start free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/gallery"
                className="text-sm font-medium text-text-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Browse templates
              </Link>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="lg:pl-6">
            <CardSpecimen />
          </div>
        </div>
      </section>

      {/* ── Measured band ────────────────────────────────────────────────── */}
      <section className="border-b border-rule">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
          {SPECS.map((spec, index) => (
            <div
              key={spec.label}
              className={
                "py-8 sm:px-6 lg:first:pl-0 lg:last:pr-0 " +
                (index % 2 === 1 ? "border-l border-rule pl-5 sm:pl-6 " : "pr-5 sm:pr-6 ") +
                (index >= 2 ? "border-t border-rule lg:border-t-0 " : "") +
                (index === 2 ? "lg:border-l lg:border-rule lg:pl-6 " : "")
              }
            >
              <dt className="qk-num text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                {spec.value}
              </dt>
              <dd className="qk-label mt-2 text-text-muted">{spec.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Pipeline, as indexed rows ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[18rem_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="qk-label text-text-muted">The pipeline</span>
            <h2 className="qk-display mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)]">
              Three steps, then it runs itself.
            </h2>
          </div>

          <div className="qk-ruled">
            {STEPS.map((step) => (
              <article
                key={step.index}
                className="grid gap-x-5 gap-y-3 py-10 first:pt-0 sm:grid-cols-[4rem_1fr]"
              >
                <div className="qk-num qk-label pt-1.5 text-red">{step.index}</div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{step.title}</h3>
                    <span className="qk-label text-text-faint">{step.detail}</span>
                  </div>
                  <p className="mt-3 max-w-xl leading-7 text-text-secondary">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-8 px-4 py-16 sm:px-6 lg:py-20">
          <div>
            <h2 className="qk-display text-[clamp(1.75rem,3.4vw,2.5rem)]">
              Your next batch is
              <br />
              an afternoon, not a week.
            </h2>
            <p className="mt-4 max-w-md text-text-secondary">
              Free to start. No card stock required until you are ready to print.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-red px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-accent"
          >
            Create a workspace
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
