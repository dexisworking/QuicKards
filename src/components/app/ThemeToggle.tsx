// ============================================
// QUICKARDS — Theme toggle
// ============================================
//
// Flips the (app) surface between light and dark. Updates the [data-app-theme]
// attribute on the app root live (no reload) AND writes the cookie so the
// server renders the same choice next visit. The server layout reads that
// cookie, so there is never a wrong-theme flash.

"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { APP_THEME_COOKIE, type AppTheme } from "@/lib/theme";

export default function ThemeToggle({ initial }: { initial: AppTheme }) {
  const [theme, setTheme] = useState<AppTheme>(initial);

  const toggle = () => {
    const next: AppTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.getElementById("qk-app")?.setAttribute("data-app-theme", next);
    // One year, root path — the layout reads this on the next server render.
    document.cookie = `${APP_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="grid size-9 place-items-center rounded-[var(--k-radius)] border border-[var(--k-border)] text-[var(--k-text-muted)] transition-colors hover:bg-[var(--k-surface-2)] hover:text-[var(--k-text)]"
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
