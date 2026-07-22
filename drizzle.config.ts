// ============================================
// QUICKARDS — Drizzle Kit configuration
// ============================================
//
// Drizzle Kit (migrations, `push`, `studio`) runs OUTSIDE Next.js, so it does
// not get Next's automatic `.env.local` loading. We load it explicitly here or
// every drizzle command fails with an empty DATABASE_URL — a confusing first
// failure otherwise.
//
// Column casing is NOT set globally to snake_case. Better Auth's generated
// schema names its own columns, and a global casing override would fight it;
// our app tables spell their snake_case column names out explicitly instead.

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // eslint-disable-next-line no-restricted-syntax -- config file, not app code
    url: process.env.DATABASE_URL ?? "",
  },
  // Loud by default: these commands mutate the database, and seeing the SQL
  // before it runs has caught more than one accidental column drop.
  verbose: true,
  strict: true,
});
