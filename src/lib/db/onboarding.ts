// ============================================
// QUICKARDS — Personal workspace creation
// ============================================
//
// Lives in db/ so it may use the raw client. Called from the Better Auth
// user-create hook (auth/server.ts) so a personal organization exists the
// instant a user is created — before they can reach any (app) page.
//
// This eliminates a real race: the App Router renders a layout and its page
// CONCURRENTLY, so a layout that "ensures" the org cannot be relied on to run
// before the page reads it. Creating the org at signup sidesteps that entirely.

import { randomUUID } from "node:crypto";

import { db } from "./client";
import { member, organization } from "./schema/auth";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "workspace"
  );
}

/** Create a personal org for a brand-new user and make them its owner. Direct
 *  inserts (not the Better Auth API) because this runs inside the user-create
 *  hook where there is no request/session context yet. */
export async function createPersonalOrg(userId: string, displayName: string): Promise<string> {
  const orgId = randomUUID();
  const slug = `${slugify(displayName)}-${Math.random().toString(36).slice(2, 8)}`;

  await db.insert(organization).values({
    id: orgId,
    name: `${displayName}'s workspace`,
    slug,
    createdAt: new Date(),
  });
  await db.insert(member).values({
    id: randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
    createdAt: new Date(),
  });

  return orgId;
}
