// ============================================
// QUICKARDS — Membership resolution
// ============================================
//
// Lives in src/lib/db so it may touch the raw client (the ESLint rule forbids
// that outside this directory). Turns a Better Auth session into the caller's
// organization + role, which is what the scoped repository needs.

import { and, eq } from "drizzle-orm";

import { db } from "./client";
import { member } from "./schema/auth";
import type { OrgRole } from "./scope";

/** Better Auth's org plugin stores role as free text; clamp it to our union so
 *  an unexpected value degrades to least privilege rather than widening it. */
const coerceRole = (role: string): OrgRole =>
  role === "owner" || role === "admin" ? role : "member";

/**
 * Resolve which organization a user is acting in.
 *
 * Prefers the session's active organization; falls back to any membership so a
 * user who never explicitly switched org still has one. Returns null when the
 * user belongs to no organization at all — the caller turns that into a 403.
 */
export async function resolveMembership(
  userId: string,
  preferredOrgId?: string | null,
): Promise<{ organizationId: string; role: OrgRole } | null> {
  if (preferredOrgId) {
    const rows = await db
      .select({ organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, preferredOrgId)))
      .limit(1);
    if (rows[0]) {
      return { organizationId: rows[0].organizationId, role: coerceRole(rows[0].role) };
    }
    // Active org set but membership missing (e.g. the user was removed) — fall
    // through to any remaining membership rather than hard-failing.
  }

  const any = await db
    .select({ organizationId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);

  return any[0] ? { organizationId: any[0].organizationId, role: coerceRole(any[0].role) } : null;
}
