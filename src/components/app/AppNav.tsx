// ============================================
// QUICKARDS — App navigation
// ============================================
//
// The authenticated header. Server component that renders the interactive bits
// (ThemeToggle, SignOutButton) as client children.
//
// Deliberately quiet: a tool's chrome should recede so the work is the loudest
// thing on screen. Nav items are set in the spec-sheet label style, and the
// only filled colour in the bar is the mark.

import Link from "next/link";

import Mark from "@/components/Mark";
import type { SessionUser } from "@/lib/auth/session";
import type { AppTheme } from "@/lib/theme";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/templates", label: "Templates" },
  { href: "/projects", label: "Batches" },
  { href: "/fonts", label: "Fonts" },
];

export default function AppNav({ user, theme }: { user: SessionUser; theme: AppTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--k-border)] bg-[var(--k-bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
          <Mark />
          <span>QuicKards</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="qk-label text-[var(--k-text-muted)] transition-colors hover:text-[var(--k-text)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="hidden max-w-[18ch] truncate text-xs text-[var(--k-text-faint)] lg:block"
            title={user.email}
          >
            {user.email}
          </span>
          <ThemeToggle initial={theme} />
          <SignOutButton />
        </div>
      </div>

      {/* Mobile: the same labels, scrollable, still no icons — the words are
          shorter than the icon + word pairing they replace. */}
      <nav
        className="mx-auto flex max-w-6xl gap-5 overflow-x-auto border-t border-[var(--k-border)] px-4 py-2.5 sm:px-6 md:hidden"
        aria-label="Primary"
      >
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="qk-label shrink-0 text-[var(--k-text-muted)] transition-colors hover:text-[var(--k-text)]"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
