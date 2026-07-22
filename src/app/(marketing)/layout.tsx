// ============================================
// QUICKARDS — Marketing shell
// ============================================
//
// Dark-only, on the DexForge @theme brand tokens — brand continuity with
// dexforge.iamdex.codes is the point. No [data-app-theme] here, so the app's
// --k-* tokens are deliberately absent; marketing styles with @theme utilities.

import Link from "next/link";

/** The mark is a card at the true CR80 ratio with a red header band — the same
 *  object the product makes, and the same shape as the hero specimen. A
 *  monogram in a rounded square would say nothing about what this is. */
function Mark() {
  return (
    <span
      className="relative block h-[1.05rem] w-[1.67rem] shrink-0 overflow-hidden rounded-[3px] bg-white/90"
      aria-hidden
    >
      <span className="absolute inset-x-0 top-0 h-[0.36rem] bg-red" />
      <span className="absolute bottom-[0.16rem] left-[0.18rem] h-[0.14rem] w-[0.5rem] rounded-full bg-black/35" />
      <span className="absolute bottom-[0.16rem] left-[0.8rem] h-[0.14rem] w-[0.62rem] rounded-full bg-black/20" />
    </span>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <Mark />
            <span>QuicKards</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/gallery"
              className="qk-label text-text-muted transition-colors hover:text-ink"
            >
              Templates
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-5">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-ink"
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

      {/* Footer as a spec strip: metadata set in the annotation style rather
          than a wall of link columns nobody clicks. */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-8 sm:px-6">
          <span className="qk-label text-text-faint">© 2026 QuicKards</span>
          <Link href="/gallery" className="qk-label text-text-muted transition-colors hover:text-ink">
            Templates
          </Link>
          <a
            href="https://dexforge.iamdex.codes"
            target="_blank"
            rel="noreferrer"
            className="qk-label ml-auto text-text-muted transition-colors hover:text-ink"
          >
            Crafted at DexForge
          </a>
        </div>
      </footer>
    </div>
  );
}
