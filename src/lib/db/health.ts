// ============================================
// QUICKARDS — Database health probe
// ============================================
//
// Lives inside src/lib/db so the /api/health route can check the connection
// WITHOUT importing the raw `db` client — which the ESLint rule forbids outside
// this directory. The rule stays absolute (no per-file exemptions to rot), and
// the route depends on this named intent instead.

import { sql } from "drizzle-orm";

import { db } from "./client";

/** Round-trips the database with the cheapest possible query. Throws if the
 *  connection or credentials are bad, so the caller can surface a 503. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}
