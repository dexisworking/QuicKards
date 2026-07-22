// ============================================
// QUICKARDS — App theme (isomorphic constants)
// ============================================
//
// Client-safe: just the cookie name and the type. The server-only reader lives
// in theme.server.ts so this module can be imported by client components (the
// ThemeToggle) without pulling `next/headers` into the client bundle.

export type AppTheme = "light" | "dark";

export const APP_THEME_COOKIE = "qk_app_theme";
