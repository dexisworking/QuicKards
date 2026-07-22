// ============================================
// QUICKARDS — Database client
// ============================================
//
// The ONE place `DATABASE_URL` is turned into a query client. Route handlers,
// repositories and the Better Auth adapter all go through the `db` exported
// here. An ESLint rule (see eslint.config.mjs) forbids importing this module
// outside `src/lib/db/**`, so callers must go through the scoped repository in
// `./scope.ts` and cannot accidentally issue an unscoped, cross-tenant query.
//
// Driver: Neon's HTTP driver (`drizzle-orm/neon-http`). Chosen for cold-start
// latency — no persistent socket to establish — which matters because every
// render request and page load touches the DB. The tradeoff is that HTTP has
// no interactive (read-then-write) transactions; the handful of places that
// need one use a single-statement CTE instead. If that ever becomes limiting,
// switching to the WebSocket `Pool` driver is a change confined to this file.
//
// Initialization is LAZY behind a Proxy. `neon()` parses the connection string
// eagerly and throws on an empty one, which would crash at import time during
// `next build`, during Better Auth schema generation, and in any route that
// never touches the database. Deferring to first query means a missing
// DATABASE_URL fails loudly at the point of use, not at module load.

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

// No schema map is passed to drizzle() on purpose. The relational query API
// (`db.query.*`) is the only thing that needs it, and we deliberately do not
// use it — every read goes through explicit `db.select().from(table)` in the
// scoped repository. Omitting it also breaks what would otherwise be an import
// cycle: schema/app.ts references the generated auth tables, so a `db` that
// imported the full schema map could not be imported by the auth config that
// generates them.
type Db = NeonHttpDatabase<Record<string, never>>;

let instance: Db | null = null;

function connect(): Db {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in (see docs/SETUP.md).",
    );
  }

  instance = drizzle(neon(url));
  return instance;
}

/** Lazily-connected Drizzle client. Safe to import anywhere in `src/lib/db`;
 *  the connection is not opened until the first query. */
export const db: Db = new Proxy({} as Db, {
  get(_target, property, receiver) {
    return Reflect.get(connect() as object, property, receiver);
  },
});
