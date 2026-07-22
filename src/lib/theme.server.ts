// ============================================
// QUICKARDS — App theme (server reader)
// ============================================
//
// SERVER ONLY (imports next/headers). Split from theme.ts so the client-safe
// constants there can be imported by the ThemeToggle without dragging
// next/headers into the client bundle.

import { cookies } from "next/headers";

import { APP_THEME_COOKIE, type AppTheme } from "./theme";

/** Light by default: a design tool is used against print output, and most ID
 *  cards are light — the same reasoning behind DexForge's customer portal. */
export async function getAppTheme(): Promise<AppTheme> {
  const value = (await cookies()).get(APP_THEME_COOKIE)?.value;
  return value === "dark" ? "dark" : "light";
}
