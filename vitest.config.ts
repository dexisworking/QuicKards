// ============================================
// QUICKARDS — Vitest configuration
// ============================================
//
// Vitest resolves modules through Vite, which does not read tsconfig `paths`.
// The alias has to be restated here or every `@/…` import fails to resolve at
// test time while typechecking cleanly — a confusing split to debug.

import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // The design library is isomorphic and its tests are pure Node — no jsdom.
    // Editor component tests will need their own environment later; declare it
    // per-file with a docblock rather than making every test pay for jsdom.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
