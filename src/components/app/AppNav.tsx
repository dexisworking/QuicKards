// ============================================
// QUICKARDS — App navigation
// ============================================
//
// The authenticated header. Server component that renders the interactive bits
// (ThemeToggle, SignOutButton) as client children.

import Link from "next/link";

import type { SessionUser } from "@/lib/auth/session";
import type { AppTheme } from "@/lib/theme";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/templates", label: "Templates" },
  { href: "/projects", label: "Projects" },
  { href: "/fonts", label: "Fonts" },
];

export default function AppNav({ user, theme }: { user: SessionUser; theme: AppTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--k-border)] bg-[var(--k-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Quic<span className="text-[var(--k-accent)]">Kards</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--k-radius)] px-3 py-1.5 text-sm text-[var(--k-text-muted)] transition-colors hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden max-w-[16ch] truncate text-sm text-[var(--k-text-muted)] md:block">
            {user.email}
          </span>
          <ThemeToggle initial={theme} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
