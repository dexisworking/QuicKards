// ============================================
// QUICKARDS — App navigation
// ============================================
//
// The authenticated header. Server component that renders the interactive bits
// (ThemeToggle, SignOutButton) as client children.

import { FileImage, LayoutDashboard, LayoutTemplate, Type } from "lucide-react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth/session";
import type { AppTheme } from "@/lib/theme";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/projects", label: "Projects", icon: FileImage },
  { href: "/fonts", label: "Fonts", icon: Type },
];

export default function AppNav({ user, theme }: { user: SessionUser; theme: AppTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--k-border)] bg-[var(--k-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-[var(--k-accent)] text-xs font-black text-white shadow-[0_5px_12px_color-mix(in_srgb,var(--k-accent)_32%,transparent)]">Q</span>
          <span>Quic<span className="text-[var(--k-accent)]">Kards</span></span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-[var(--k-radius)] px-3 py-2 text-sm font-medium text-[var(--k-text-muted)] transition-colors hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden size-8 items-center justify-center rounded-full bg-[var(--k-surface-2)] text-xs font-bold text-[var(--k-text-muted)] lg:inline-flex" title={user.email}>
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-[15ch] truncate text-sm text-[var(--k-text-muted)] xl:block">{user.email}</span>
          <ThemeToggle initial={theme} />
          <SignOutButton />
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-[var(--k-border)] px-3 py-2 md:hidden sm:px-5" aria-label="Primary">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 rounded-[var(--k-radius)] px-3 py-1.5 text-xs font-medium text-[var(--k-text-muted)] transition-colors hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)]">
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
