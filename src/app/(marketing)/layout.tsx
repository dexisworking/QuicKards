// ============================================
// QUICKARDS — Marketing shell
// ============================================
//
// Dark-only, on the DexForge @theme brand tokens — brand continuity with
// dexforge.iamdex.codes is the point. No [data-app-theme] here, so the app's
// --k-* tokens are deliberately absent; marketing styles with @theme utilities.

import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-red text-xs font-black text-white shadow-[0_5px_15px_rgba(220,38,38,0.3)]">Q</span>
            <span>Quic<span className="text-red">Kards</span></span>
          </Link>
          <nav className="ml-auto hidden items-center gap-4 text-sm text-text-secondary md:flex">
            <Link href="/gallery" className="transition-colors hover:text-ink">
              Gallery
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-[var(--radius-md)] bg-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-accent"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-rule bg-bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-text-muted sm:px-6">
          <span>© 2026 QuicKards</span>
          <a
            href="https://dexforge.iamdex.codes"
            className="transition-colors hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            Crafted at DexForge
          </a>
        </div>
      </footer>
    </div>
  );
}
