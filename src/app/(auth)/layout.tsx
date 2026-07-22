// ============================================
// QUICKARDS — Auth shell
// ============================================
//
// Centered card on the LIGHT app surface (wrapped in [data-app-theme="light"]
// so the --k-* form primitives theme correctly). Already-signed-in users are
// bounced to the dashboard rather than shown a sign-in form.

import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div data-app-theme="light" className="min-h-dvh bg-[var(--k-bg)] p-3 sm:p-5">
      <div className="grid min-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[24px] border border-[var(--k-border)] bg-[var(--k-surface)] lg:grid-cols-[1.05fr_.95fr] sm:min-h-[calc(100dvh-2.5rem)]">
        <aside className="relative hidden overflow-hidden bg-[#111113] p-10 text-white lg:flex lg:flex-col">
          <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
          <div className="absolute -left-24 -top-20 size-96 rounded-full bg-[var(--k-accent)]/25 blur-3xl" aria-hidden />
          <Link href="/" className="relative flex items-center gap-2 text-xl font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-[var(--k-accent)] text-sm font-black">Q</span>Quic<span className="text-[var(--k-accent-hover)]">Kards</span></Link>
          <div className="relative my-auto max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300"><Sparkles className="size-3.5 text-[var(--k-accent-hover)]" />The faster way to issue cards</span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight">Create once. Hand out hundreds.</h1>
            <p className="mt-4 leading-7 text-zinc-400">The workspace for teams that need polished, personalized cards without the spreadsheet chaos.</p>
            <div className="mt-8 space-y-3 text-sm text-zinc-300">{["Design a reusable card template", "Map names, IDs, and photos in minutes", "Export a ready-to-print batch"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle2 className="size-4 text-[var(--k-accent-hover)]" />{item}</div>)}</div>
          </div>
          <p className="relative text-xs text-zinc-500">© 2026 QuicKards · A DexForge product</p>
        </aside>
        <div className="grid place-items-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-10 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight lg:hidden"><span className="grid size-8 place-items-center rounded-lg bg-[var(--k-accent)] text-sm font-black text-white">Q</span>Quic<span className="text-[var(--k-accent)]">Kards</span></Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
