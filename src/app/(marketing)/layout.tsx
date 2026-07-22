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
      <header className="sticky top-0 z-40 border-b border-rule bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Quic<span className="text-red">Kards</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
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

      <footer className="border-t border-rule">
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
