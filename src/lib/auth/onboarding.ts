// ============================================
// QUICKARDS — First-run onboarding
// ============================================
//
// Better Auth signs a user up but does NOT give them an organization, and every
// app table is org-scoped — so a brand-new user has nowhere to put anything.
// This creates a personal workspace on first authenticated load, making signup
// → usable app seamless. A personal account is just an org with one member, so
// there is no separate "personal vs team" code path anywhere else.

import { headers } from "next/headers";

import { resolveMembership } from "@/lib/db/membership";
import { auth } from "./server";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "workspace"
  );
}

/** Ensure the user has an organization. No-op if they already belong to one
 *  (an invited teammate, or a returning user). */
export async function ensureOrganization(userId: string, displayName: string): Promise<void> {
  const existing = await resolveMembership(userId);
  if (existing) return;

  // Random slug suffix so two "Jane" workspaces do not collide on the unique
  // slug index. Created through Better Auth's API so membership + owner role +
  // active-org are all set consistently.
  const slug = `${slugify(displayName)}-${Math.random().toString(36).slice(2, 8)}`;
  await auth.api.createOrganization({
    body: { name: `${displayName}'s workspace`, slug },
    headers: await headers(),
  });
}
