// ============================================
// QUICKARDS — Server-side session → org scope
// ============================================
//
// The bridge every authenticated route handler and server component uses to go
// from "an incoming request" to "an OrgScope I can query with". This is where
// the tenancy boundary is established for a request.

import { headers } from "next/headers";

import { resolveMembership } from "@/lib/db/membership";
import type { OrgScope } from "@/lib/db/scope";
import { auth } from "./server";

/** Carries an HTTP status so route handlers can map auth failures uniformly. */
export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type SessionUser = { id: string; email: string; name: string };

/** The signed-in user, or null. `headers()` is awaited because Next 16 made it
 *  async-only — a synchronous read is a build-time type error now. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

/**
 * Require an authenticated user with an organization, returning their scope.
 *
 * Throws AuthError(401) when not signed in, AuthError(403) when the user has no
 * organization. Everything downstream queries through the returned scope, so a
 * handler physically cannot read another tenant's data.
 */
export async function requireOrgScope(): Promise<OrgScope> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new AuthError(401, "Not authenticated");
  }

  const membership = await resolveMembership(
    session.user.id,
    session.session.activeOrganizationId,
  );
  if (!membership) {
    throw new AuthError(403, "No organization for this account");
  }

  return {
    organizationId: membership.organizationId,
    userId: session.user.id,
    role: membership.role,
  };
}
